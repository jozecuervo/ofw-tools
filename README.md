# Our Family Wizard Message Analysis Tool

## Description

This tool is specifically designed to analyze communication records from Our Family Wizard (OFW), a co-parenting application. It extracts and processes messages from a PDF file downloaded from the OFW platform, providing insights into messaging dynamics. The tool analyzes the number of messages sent and read, average read time, and the total word count for each sender. The results are outputted in Markdown format to the console, as a CSV file, and as an intermediate JSON file for detailed analysis.

## Features

- Specifically designed for PDFs downloaded from Our Family Wizard.
- Analyzes messages for sent count, read count, average read time, and word count.
- Outputs data in Markdown format, as a CSV file, and as an intermediate JSON file.

## Requirements

- Node.js
- Additional Node.js packages (list any packages that need to be installed, if any)

## Installation

1. Clone the repository or download the source code.
2. Navigate to the project directory.
3. Install required Node.js packages (if any).

   ```bash
   npm install
   ```

## Usage

### Step 1: Download PDF from Our Family Wizard

Before using this tool, you need to download your message records as a PDF file from the Our Family Wizard website:

1. Log in to your OFW account.
2. Navigate to the appropriate section to access messages.
3. Download your messages as a PDF file. Use full pages per message for the best results.

### Step 2: Run the Analysis Tool

1. Place the downloaded OFW PDF file in an accessible directory.
2. Run the script from the command line, providing the path to the PDF file as an argument.

   ```bash
   node index.js [path_to_ofw_pdf_file]
   ```

   Replace `[path_to_ofw_pdf_file]` with the path to your OFW PDF file.

3. The script processes the PDF file and outputs:
   - A JSON file, representing the parsed message data from the PDF.
   - A CSV file of analysis stats in the same directory as the PDF file.
   - In the console, as a Markdown table of the same analysis.

## Output

- **Markdown Table**: Displayed in the console, it includes weekly statistics for each user, with details on messages sent, messages read, average read time, and word count (for senders).
- **CSV File**: Provides the same data as the Markdown table and can be imported into spreadsheet software for further analysis.
- **JSON File**: An intermediate file containing the parsed message data, useful for custom analyses or integration with other tools.

## Example

```bash
node index.js ~/Downloads/OFW_Messages_Report_.pdf
```

This command will process the `OFW_Messages_Report_.pdf` file and output the results as described.

## License

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-nd/4.0/ or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
