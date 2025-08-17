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

function isShortMessage(body) {
	const text = String(body || '');
	const wc = text.trim().split(/\s+/).filter(Boolean).length;
	const passiveAggressive = /\b(fine|whatever|sure|ok)\b/i.test(text);
	return wc <= 3 && !passiveAggressive;
}

function toSentimentCategory(value) {
	const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
	if (v === 'positive' || v === 'neutral' || v === 'negative' || v === 'mixed') return v;
	const n = Number(v);
	if (!Number.isNaN(n)) {
		if (n > 0.2) return 'positive';
		if (n < -0.2) return 'negative';
		return 'neutral';
	}
	return 'unknown';
}

function toLevelCategory(value) {
	const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
	if (v === 'low' || v === 'medium' || v === 'high') return v;
	const n = Number(v);
	if (!Number.isNaN(n)) {
		if (n <= 3) return 'low';
		if (n <= 6) return 'medium';
		return 'high';
	}
	return 'unknown';
}

const ALLOWED_FLAGS = new Set([
	'insult','threat','gaslighting','darvo','blame-shift','minimization','legal-threat','coercion','manipulation','profanity','boundary-violation','inconsistency','false-allegation','exaggerated-absolutes','scheduling-dispute','custody-threat'
]);

function normalizeOllamaOutput(parsed, raw, message, contextMessages, preserveNumeric = false) {
	const short = isShortMessage(message && message.body);
	const base = parsed && typeof parsed === 'object' ? parsed : {};
	const flagsIn = Array.isArray(base.flags) ? base.flags.filter(f => typeof f === 'string') : [];
	let flags = flagsIn.filter(f => ALLOWED_FLAGS.has(f));
	// numeric forms if present
	const numericSentiment = (base && base.sentiment !== undefined && !Number.isNaN(Number(base.sentiment))) ? Number(base.sentiment) : null;
	const numericConflict = (base && base.conflict_level !== undefined && !Number.isNaN(Number(base.conflict_level))) ? Number(base.conflict_level) : null;
	const numericDeception = (base && base.deception_risk !== undefined && !Number.isNaN(Number(base.deception_risk))) ? Number(base.deception_risk) : null;

	let sentiment = toSentimentCategory(base.sentiment);
	let conflict_level = toLevelCategory(base.conflict_level);
	let deception_risk = toLevelCategory(base.deception_risk);
	let reason = typeof base.reason === 'string' ? base.reason.trim() : '';

	if (short) {
		const hasStrongContext = (contextMessages || []).slice(-3).some(cm => /\b(threat|lawsuit|custody|idiot|stupid|never|always)\b/i.test(String(cm && cm.body)) || /!{2,}/.test(String(cm && cm.body)));
		if (!hasStrongContext) {
			sentiment = (sentiment === 'negative' || sentiment === 'positive') ? sentiment : 'neutral';
			conflict_level = 'low';
			deception_risk = 'low';
			if (flags.length === 0) flags = [];
			if (!reason) reason = 'Short reply; insufficient content to infer conflict without context.';
		}
	}

	if (sentiment === 'unknown') sentiment = 'neutral';
	if (conflict_level === 'unknown') conflict_level = 'low';
	if (deception_risk === 'unknown') deception_risk = 'low';

	const out = {
		sentiment,
		conflict_level,
		deception_risk,
		flags,
		reason: reason || '',
		...(parsed && typeof parsed === 'object' ? {} : { raw })
	};

	if (preserveNumeric) {
		if (numericSentiment !== null) out.sentiment_num = numericSentiment;
		if (numericConflict !== null) out.conflict_level_num = numericConflict;
		if (numericDeception !== null) out.deception_risk_num = numericDeception;
	}

	return out;
}

class MessageProcessor {
	constructor(modelName = 'llama3.1', contextLimit = 3, options = {}) {
		this.modelName = modelName;
		this.contextLimit = contextLimit; // Limit context to last N messages in thread to avoid excessive prompt length
		this.results = {};
		this.updatedMessages = [];
		this.threadSummaries = {};
		this.preserveNumeric = Boolean(options && options.preserveNumeric);
	}

	async processMessage(message, contextMessages = []) {
		const prompt = `You are a forensic communication analyst.

Analyze the CURRENT message using the prior messages as context. Detect high-conflict and deceptive language in a divorce conversation.

Return ONLY compact JSON with keys: sentiment, conflict_level, deception_risk, flags, reason. Do not add extra text or explanations outside the JSON.

Definitions:
- sentiment: "-1 to 1"
- conflict_level: "0 - 10"
- deception_risk: "0 - 10"
- flags: zero or more of ["insult","threat","gaslighting" (denying reality to confuse),"darvo" (deny, attack, reverse victim/offender),"blame-shift","minimization","legal-threat","coercion","manipulation","profanity","boundary-violation","inconsistency" (mismatches with prior messages),"false-allegation","exaggerated-absolutes","scheduling-dispute","custody-threat"]
- reason: one short sentence citing the behavior (quote or paraphrase)

Consider indicators: aggression, contempt, threats, legal intimidation, shifting blame, inconsistencies with prior context, evasiveness, exaggerated absolutes, coercion, DARVO, gaslighting, false allegations.

Few-shot examples:
Prior: "I'll pick up the kids at 5 PM as agreed."
Current: "You never show up on time, you're always late and ruining their lives."
Output: {"sentiment":"negative","conflict_level":"high","deception_risk":"medium","flags":["blame-shift","exaggerated-absolutes"],"reason":"Message shifts blame with exaggerated claim of 'always late' despite prior agreement."}
\nPrior: "The kids are with me this weekend as per the agreement."
Current: "If you try to take them, I'll call my lawyer and you'll regret it."
Output: {"sentiment":"negative","conflict_level":"high","deception_risk":"medium","flags":["legal-threat","coercion","custody-threat"],"reason":"Uses legal intimidation to enforce custody terms."}
`;
		try {
			// Limit context to avoid overwhelming the model
			const context = contextMessages
				.slice(-this.contextLimit)
				.map(msg => {
					const s = {
						sentiment: typeof msg.sentiment === 'number' ? msg.sentiment : null,
						sentiment_natural: typeof msg.sentiment_natural === 'number' ? msg.sentiment_natural : null,
						tone: typeof msg.tone === 'number' ? msg.tone : null,
						sentiment_per_word: typeof msg.sentiment_per_word === 'number' ? msg.sentiment_per_word : null,
						natural_per_word: typeof msg.natural_per_word === 'number' ? msg.natural_per_word : null,
					};
					return [
						'Previous message:',
						`- Sender: ${msg.sender || 'Unknown'}`,
						`- Baseline sentiment (heuristics): sentiment=${s.sentiment}, natural=${s.sentiment_natural}, tone=${s.tone}, spw=${s.sentiment_per_word}, npw=${s.natural_per_word}`,
						`- Body: ${msg.body}`,
					].join('\n');
				})
				.join('\n');
			const cur = {
				sentiment: typeof message.sentiment === 'number' ? message.sentiment : null,
				sentiment_natural: typeof message.sentiment_natural === 'number' ? message.sentiment_natural : null,
				tone: typeof message.tone === 'number' ? message.tone : null,
				sentiment_per_word: typeof message.sentiment_per_word === 'number' ? message.sentiment_per_word : null,
				natural_per_word: typeof message.natural_per_word === 'number' ? message.natural_per_word : null,
			};
			const fullPrompt = `${prompt}\n\nContext:\n${context ? context + '\n\n' : ''}Current message:\n- Sender: ${message.sender || 'Unknown'}\n- Baseline sentiment (heuristics): sentiment=${cur.sentiment}, natural=${cur.sentiment_natural}, tone=${cur.tone}, spw=${cur.sentiment_per_word}, npw=${cur.natural_per_word}\n- Body: ${message.body}`;

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
		const { maxMessages, preserveNumeric = false } = { maxMessages: Infinity, preserveNumeric: false, ...options };
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
						const normalized = normalizeOllamaOutput(parsed, result, message, threadContexts[threadId], this.preserveNumeric || preserveNumeric);
						sentimentLabel = normalized.sentiment;
						this.results[key] = {
							status: 'success',
							sentiment: sentimentLabel,
							threadId,
							threadIndex: message.threadIndex,
						};
						const stored = normalized;
						this.threadSummaries[threadId].messages.push({
							sender: message.sender,
							sentDate: message.sentDate,
							body: message.body,
							sentiment: stored.sentiment,
							conflict_level: stored.conflict_level,
							deception_risk: stored.deception_risk,
							flags: stored.flags,
							baseline_sentiment: typeof message.sentiment === 'number' ? message.sentiment : null,
							baseline_sentiment_natural: typeof message.sentiment_natural === 'number' ? message.sentiment_natural : null,
							baseline_tone: typeof message.tone === 'number' ? message.tone : null,
							baseline_spw: typeof message.sentiment_per_word === 'number' ? message.sentiment_per_word : null,
							baseline_npw: typeof message.natural_per_word === 'number' ? message.natural_per_word : null,
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

					const stored = normalizeOllamaOutput(parsed, result, message, threadContexts[threadId], this.preserveNumeric || preserveNumeric);
					this.updatedMessages.push({
						...message,
						sentiment_ollama: stored,
						baseline_sentiment: typeof message.sentiment === 'number' ? message.sentiment : null,
						baseline_sentiment_natural: typeof message.sentiment_natural === 'number' ? message.sentiment_natural : null,
						baseline_tone: typeof message.tone === 'number' ? message.tone : null,
						baseline_spw: typeof message.sentiment_per_word === 'number' ? message.sentiment_per_word : null,
						baseline_npw: typeof message.natural_per_word === 'number' ? message.natural_per_word : null,
					});
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

			// Threaded view including LLM sentiment
			const threadsLlmFile = path.join(outputDir, `${inputBase} - threads.llm.md`);
			const threadsLlmContent = this.generateThreadedLlmMarkdown();
			await fs.writeFile(threadsLlmFile, threadsLlmContent);
			logger.info(`Saved LLM threaded summary to ${threadsLlmFile}`);

			// CSV export of sentiment results
			const csvHeader = 'id,threadId,threadIndex,sender,sentDate,subject,wordCount,sentiment,conflict_level,deception_risk,flags,reason,sentiment_num,conflict_level_num,deception_risk_num';
			const csvRows = [csvHeader];
			for (const m of this.updatedMessages) {
				const sa = m && m.sentiment_ollama ? m.sentiment_ollama : {};
				const esc = (s) => String(s == null ? '' : s).replace(/"/g, '""');
				const flags = Array.isArray(sa.flags) ? sa.flags.join(';') : '';
				csvRows.push([
					esc(m.id),
					esc(m.threadId),
					esc(m.threadIndex),
					esc(m.sender),
					new Date(m.sentDate).toISOString(),
					`"${esc(m.subject || '')}"`,
					esc(m.wordCount || ''),
					esc(sa.sentiment || ''),
					esc(sa.conflict_level || ''),
					esc(sa.deception_risk || ''),
					`"${esc(flags)}"`,
					`"${esc(sa.reason || '')}"`,
					esc(sa.sentiment_num != null ? sa.sentiment_num : ''),
					esc(sa.conflict_level_num != null ? sa.conflict_level_num : ''),
					esc(sa.deception_risk_num != null ? sa.deception_risk_num : ''),
				].join(',')
				);
			}
			const csvFile = path.join(outputDir, `${inputBase} - sentiment.csv`);
			await fs.writeFile(csvFile, csvRows.join('\n'));
			logger.info(`Saved sentiment CSV to ${csvFile}`);
		} catch (error) {
			logger.error(`Error reading file ${inputFile}: ${error.message}`);
		}
	}

	generateSummaryMarkdown() {
		let markdown = '# Sentiment Analysis Summary\n\n';
		const sentiments = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
		const conflictLevels = { low: 0, medium: 0, high: 0 };
		const deceptionRisks = { low: 0, medium: 0, high: 0 };

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
				markdown += `- **Sentiment**: ${msg.sentiment || 'Unknown'}\n`;
				markdown += `- **Conflict Level**: ${msg.conflict_level || 'Unknown'}\n`;
				markdown += `- **Deception Risk**: ${msg.deception_risk || 'Unknown'}\n`;
				markdown += `- **Flags**: ${Array.isArray(msg.flags) && msg.flags.length ? msg.flags.join(', ') : 'None'}\n`;
				markdown += `- **Reason**: ${msg.reason || 'None'}\n\n`;

				const s = String(msg.sentiment || '').toLowerCase();
				if (s.includes('positive')) sentiments.positive++;
				else if (s.includes('negative')) sentiments.negative++;
				else if (s.includes('neutral')) sentiments.neutral++;
				else if (s.includes('mixed')) sentiments.mixed++;

				const c = String(msg.conflict_level || '').toLowerCase();
				if (c.includes('low')) conflictLevels.low++;
				else if (c.includes('medium')) conflictLevels.medium++;
				else if (c.includes('high')) conflictLevels.high++;

				const d = String(msg.deception_risk || '').toLowerCase();
				if (d.includes('low')) deceptionRisks.low++;
				else if (d.includes('medium')) deceptionRisks.medium++;
				else if (d.includes('high')) deceptionRisks.high++;
			}
		}

		markdown += '## Overall Summary\n';
		markdown += `- **Total Messages Processed**: ${Object.keys(this.results).length}\n`;
		markdown += `- **Positive**: ${sentiments.positive}\n`;
		markdown += `- **Negative**: ${sentiments.negative}\n`;
		markdown += `- **Neutral**: ${sentiments.neutral}\n`;
		markdown += `- **Mixed**: ${sentiments.mixed}\n`;
		markdown += `- **Conflict Levels**: Low: ${conflictLevels.low}, Medium: ${conflictLevels.medium}, High: ${conflictLevels.high}\n`;
		markdown += `- **Deception Risks**: Low: ${deceptionRisks.low}, Medium: ${deceptionRisks.medium}, High: ${deceptionRisks.high}\n`;
		return markdown;
	}

	generateThreadedLlmMarkdown() {
		let markdown = '# Threaded LLM Sentiment Summary\n\n';
		for (const threadId in this.threadSummaries) {
			const thread = this.threadSummaries[threadId];
			markdown += `## ${thread.subject}\n`;
			markdown += `- From/Participants: ${thread.participants.join(', ')}\n`;
			markdown += `- Messages: ${thread.messages.length}\n\n`;
			for (const msg of thread.messages) {
				const dt = new Date(msg.sentDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
				const flags = Array.isArray(msg.flags) && msg.flags.length ? msg.flags.join(', ') : '';
				const body = String(msg.body || '').replace(/\n/g, ' ');
				const toLine = ''; // Not available here; this is a summary view
				markdown += `- From: **${msg.sender}** ${dt}\n`;
				if (toLine) markdown += `- To:\n${toLine}\n`;
				markdown += `- Message ${msg.threadIndex}\n`;
				markdown += `- Word Count: **${(body.match(/\S+/g)||[]).length}**, LLM Sentiment: **${msg.sentiment || ''}**, Conflict: **${msg.conflict_level || ''}**, Deception: **${msg.deception_risk || ''}**${flags ? `, Flags: **${flags}**` : ''}\n\n`;
				markdown += `${body}\n\n`;
			}
		}
		return markdown;
	}
}

module.exports = { MessageProcessor };


