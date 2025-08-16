const { default: ollama } = require('ollama');
const fs = require('fs-extra');
const path = require('path');
const { createLogger, format, transports } = require('winston');

// Configure logging
const logger = createLogger({
	level: 'info',
	format: format.combine(format.timestamp(), format.json()),
	transports: [new transports.Console(), new transports.File({ filename: 'process.log' })],
});

function extractJsonFromText(text) {
	if (!text || typeof text !== 'string') return null;
	const trimmed = text.trim();
	// Direct JSON
	if (trimmed.startsWith('{')) {
		try { return JSON.parse(trimmed); } catch (_) {}
	}
	// Fenced JSON block
	const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
	if (fenceMatch && fenceMatch[1]) {
		try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
	}
	// Heuristic: first '{' to last '}'
	const first = trimmed.indexOf('{');
	const last = trimmed.lastIndexOf('}');
	if (first !== -1 && last !== -1 && last > first) {
		const candidate = trimmed.slice(first, last + 1);
		try { return JSON.parse(candidate); } catch (_) {}
	}
	return null;
}

class MessageProcessor {
	constructor(modelName = 'llama3.1', contextLimit = 3) {
		this.modelName = modelName;
		this.contextLimit = contextLimit; // Limit context to last N messages in thread to avoid excessive prompt length
		this.results = {};
		this.updatedMessages = [];
		this.threadSummaries = {};
	}

	async processMessage(message, contextMessages = []) {
		const prompt = `You are a forensic communication analyst.

Analyze the CURRENT message using the prior messages as context. Detect high-conflict and deceptive language in a divorce conversation.

Return ONLY compact JSON with keys: sentiment, conflict_level, deception_risk, flags, reason. Do not add extra text or explanations outside the JSON.

Definitions:
- sentiment: "-1 to 1"
- conflict_level: "0 - 10"
- deception_risk: "0 - 10"
- flags: zero or more of ["insult","threat","gaslighting" (denying reality to confuse),"darvo" (deny, attack, reverse victim/offender),"blame-shift","minimization","legal-threat","coercion","manipulation","profanity","boundary-violation","inconsistency" (mismatches with prior messages),"false-allegation"]
- reason: one short sentence citing the behavior (quote or paraphrase)

Consider indicators: aggression, contempt, threats, legal intimidation, shifting blame, inconsistencies with prior context, evasiveness, exaggerated absolutes, coercion, DARVO, gaslighting, false allegations.

Few-shot example:
Prior: "I'll pick up the kids at 5 PM as agreed."
Current: "You never show up on time, you're always late and ruining their lives."
Output: {"sentiment":"-.9","conflict_level":"9","deception_risk":"5","flags":["blame-shift","exaggerated-absolutes"],"reason":"Message shifts blame with exaggerated claim of 'always late' despite prior agreement."}
`;
		try {
			// Limit context to avoid overwhelming the model
			const context = contextMessages
				.slice(-this.contextLimit)
				.map(msg => `Previous message: ${msg.body}`)
				.join('\n');
			const fullPrompt = `${prompt}\n\nContext:\n${context ? context + '\n' : ''}Current message: ${message.body}`;

			const response = await ollama.chat({
				model: this.modelName,
				messages: [{ role: 'user', content: fullPrompt }],
			});
			const result = (response && response.message && response.message.content ? response.message.content : '').trim();
			logger.info(`Successfully processed message threadId:${message.threadId}, index:${message.threadIndex}`);
			return result;
		} catch (error) {
			logger.error(`Error processing message threadId:${message.threadId}, index:${message.threadIndex}: ${error.message}`);
			return null;
		}
	}

	organizeMessages(messages) {
		const threads = {};
		for (const msg of messages) {
			const threadId = msg.threadId;
			if (!threads[threadId]) threads[threadId] = [];
			threads[threadId].push(msg);
		}

		for (const threadId in threads) {
			threads[threadId].sort((a, b) => new Date(a.sentDate) - new Date(b.sentDate));
			this.threadSummaries[threadId] = {
				messages: [],
				subject: threads[threadId][0].subject,
				participants: [
					...new Set(
						threads[threadId].flatMap(msg => [msg.sender, ...Object.keys(msg.recipientReadTimes || {})])
					),
				],
			};
		}

		return Object.values(threads).flat();
	}

	async processJsonFile(inputFile, outputDir = 'output', options = {}) {
		const { maxMessages } = { maxMessages: Infinity, ...options };
		try {
			const messages = await fs.readJson(inputFile);
			if (!messages.length) {
				logger.warn(`No messages found in ${inputFile}`);
				return;
			}

			await fs.ensureDir(outputDir);
			logger.info(`Found ${messages.length} messages across ${new Set(messages.map(m => m.threadId)).size} threads`);

			const orderedMessages = this.organizeMessages(messages);
			const threadContexts = {};

			let processed = 0;
			for (const message of orderedMessages) {
				if (processed >= maxMessages) {
					logger.info(`Reached maxMessages limit (${maxMessages}). Stopping early.`);
					break;
				}
				const threadId = message.threadId;
				if (!threadContexts[threadId]) threadContexts[threadId] = [];

				try {
					let parsed = null;
					let sentimentLabel = 'unknown';
					const result = await this.processMessage(message, threadContexts[threadId]);
					const key = `${threadId}_${message.threadIndex}`;
					if (result) {
						parsed = extractJsonFromText(result);
						sentimentLabel = parsed && typeof parsed.sentiment === 'string'
							? parsed.sentiment
							: (String(result).toLowerCase().match(/positive|negative|neutral/) || [null])[0] || 'unknown';
						this.results[key] = {
							status: 'success',
							sentiment: sentimentLabel,
							threadId,
							threadIndex: message.threadIndex,
						};
						const stored = parsed || {
							sentiment: sentimentLabel,
							conflict_level: 'unknown',
							deception_risk: 'unknown',
							flags: [],
							reason: '',
							...(parsed ? {} : { raw: result })
						};
						this.threadSummaries[threadId].messages.push({
							sender: message.sender,
							sentDate: message.sentDate,
							body: message.body,
							sentiment: stored.sentiment,
							conflict_level: stored.conflict_level,
							deception_risk: stored.deception_risk,
							flags: stored.flags,
							threadIndex: message.threadIndex,
						});
						logger.info(`Processed message threadId:${threadId}, index:${message.threadIndex}`);
					} else {
						this.results[key] = {
							status: 'failed',
							error: 'No result returned',
							threadId,
							threadIndex: message.threadIndex,
						};
						this.threadSummaries[threadId].messages.push({
							sender: message.sender,
							sentDate: message.sentDate,
							body: message.body,
							sentiment: 'Failed to process',
							threadIndex: message.threadIndex,
						});
						logger.error(`Failed to process message threadId:${threadId}, index:${message.threadIndex}`);
					}

					const stored = parsed || {
						sentiment: sentimentLabel,
						conflict_level: 'unknown',
						deception_risk: 'unknown',
						flags: [],
						reason: '',
						...(parsed ? {} : { raw: result })
					};
					this.updatedMessages.push({ ...message, sentiment_ollama: stored });
					threadContexts[threadId].push(message);
					processed += 1;
				} catch (error) {
					this.results[`${threadId}_${message.threadIndex}`] = {
						status: 'error',
						error: error.message,
						threadId,
						threadIndex: message.threadIndex,
					};
					this.threadSummaries[threadId].messages.push({
						sender: message.sender,
						sentDate: message.sentDate,
						body: message.body,
						sentiment: `Error: ${error.message}`,
						threadIndex: message.threadIndex,
					});
					this.updatedMessages.push({ ...message, sentiment_ollama: `Error: ${error.message}` });
					logger.error(`Error processing message threadId:${threadId}, index:${message.threadIndex}: ${error.message}`);
					processed += 1;
				}
			}

			const inputBase = path.basename(inputFile, path.extname(inputFile));
			const outputJson = path.join(outputDir, `${inputBase} - LLM processed.json`);
			await fs.writeJson(outputJson, this.updatedMessages, { spaces: 2 });
			logger.info(`Saved updated JSON to ${outputJson}`);

			const summaryFile = path.join(outputDir, `${inputBase} - summary.md`);
			const summaryContent = this.generateSummaryMarkdown();
			await fs.writeFile(summaryFile, summaryContent);
			logger.info(`Saved summary to ${summaryFile}`);
		} catch (error) {
			logger.error(`Error reading file ${inputFile}: ${error.message}`);
		}
	}

	generateSummaryMarkdown() {
		let markdown = '# Sentiment Analysis Summary\n\n';
		const sentiments = { positive: 0, negative: 0, neutral: 0 };

		for (const threadId in this.threadSummaries) {
			const thread = this.threadSummaries[threadId];
			markdown += `## Thread ${threadId}: ${thread.subject}\n`;
			markdown += `- **Participants**: ${thread.participants.join(', ')}\n`;
			markdown += `- **Message Count**: ${thread.messages.length}\n\n`;
			markdown += '### Messages\n';

			for (const msg of thread.messages) {
				markdown += `#### Message ${msg.threadIndex}\n`;
				markdown += `- **Sender**: ${msg.sender}\n`;
				markdown += `- **Sent Date**: ${new Date(msg.sentDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`;
				markdown += `- **Body**: ${String(msg.body || '').replace(/\n/g, ' ')}\n`;
				markdown += `- **Sentiment**: ${msg.sentiment}\n\n`;

				const s = String(msg.sentiment || '').toLowerCase();
				if (s.includes('positive')) sentiments.positive++;
				else if (s.includes('negative')) sentiments.negative++;
				else if (s.includes('neutral')) sentiments.neutral++;
			}
		}

		markdown += '## Overall Summary\n';
		markdown += `- **Total Messages Processed**: ${Object.keys(this.results).length}\n`;
		markdown += `- **Positive**: ${sentiments.positive}\n`;
		markdown += `- **Negative**: ${sentiments.negative}\n`;
		markdown += `- **Neutral**: ${sentiments.neutral}\n`;
		return markdown;
	}
}

module.exports = { MessageProcessor };


