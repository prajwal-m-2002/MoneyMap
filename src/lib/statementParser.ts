import type {
  BankPresetId,
  ParsedRawTransaction,
  StatementColumnMapping,
  StatementParseResult,
  PaymentMethod,
  Transaction,
} from '@/types/finance'

// ── 1. Smart Narration Cleaning & Categorization Rules ────────

interface NarrationMatch {
  pattern: RegExp
  title: string
  category: string
  method: PaymentMethod
  isIncome?: boolean
}

const NARRATION_RULES: NarrationMatch[] = [
  // Salary & Direct Incomes
  {
    pattern: /(salary|payroll|stipend|wages|employer|direct deposit)/i,
    title: 'Monthly Salary',
    category: 'Salary',
    method: 'Net Banking',
    isIncome: true,
  },
  {
    pattern: /(int\.?\s*pd|interest\s*credit|savings\s*int|interest\s*paid)/i,
    title: 'Bank Savings Interest',
    category: 'Income',
    method: 'Net Banking',
    isIncome: true,
  },
  {
    pattern: /(dividend|div\s*paid|rbi\s*interest)/i,
    title: 'Investment Dividend',
    category: 'Income',
    method: 'Net Banking',
    isIncome: true,
  },
  {
    pattern: /(cashback|reward\s*points|refund|reversal)/i,
    title: 'Cashback / Refund',
    category: 'Income',
    method: 'UPI',
    isIncome: true,
  },

  // Food & Dining / Delivery
  { pattern: /(swiggy|bundl)/i, title: 'Swiggy Order', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(zomato)/i, title: 'Zomato Food Order', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(starbucks|tata\s*starbucks)/i, title: 'Starbucks Coffee', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(mcdonald|mcd)/i, title: "McDonald's", category: 'Food & Dining', method: 'UPI' },
  { pattern: /(kfc|yum\s*restaurants)/i, title: 'KFC', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(domino|jubilant\s*food)/i, title: "Domino's Pizza", category: 'Food & Dining', method: 'UPI' },
  { pattern: /(chaayos|chai\s*point)/i, title: 'Chaayos / Tea', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(haldiram|bikanervala)/i, title: 'Haldirams / Sweets', category: 'Food & Dining', method: 'UPI' },
  { pattern: /(restaurant|cafe|bakery|diner|kitchen|eatery)/i, title: 'Restaurant Dining', category: 'Food & Dining', method: 'Debit Card' },

  // Groceries & Daily Essentials
  { pattern: /(blinkit|grofers)/i, title: 'Blinkit Instant Grocery', category: 'Groceries', method: 'UPI' },
  { pattern: /(zepto)/i, title: 'Zepto Quick Grocery', category: 'Groceries', method: 'UPI' },
  { pattern: /(bigbasket|innovative\s*retail)/i, title: 'BigBasket Groceries', category: 'Groceries', method: 'UPI' },
  { pattern: /(instamart)/i, title: 'Swiggy Instamart', category: 'Groceries', method: 'UPI' },
  { pattern: /(dmart|avenue\s*supermarts)/i, title: 'DMart Supermarket', category: 'Groceries', method: 'Debit Card' },
  { pattern: /(spencer|nature\s*basket|more\s*retail|reliance\s*fresh|supermarket)/i, title: 'Supermarket Groceries', category: 'Groceries', method: 'Debit Card' },

  // Transportation & Fuel
  { pattern: /(uber|uber\s*india)/i, title: 'Uber Ride', category: 'Transportation', method: 'UPI' },
  { pattern: /(ola\s*cabs|ani\s*tech)/i, title: 'Ola Cab / Auto', category: 'Transportation', method: 'UPI' },
  { pattern: /(rapido|roppen)/i, title: 'Rapido Bike Ride', category: 'Transportation', method: 'UPI' },
  { pattern: /(namma\s*yatri)/i, title: 'Namma Yatri Auto', category: 'Transportation', method: 'UPI' },
  { pattern: /(fastag|nhai|toll)/i, title: 'FASTag Toll Recharge', category: 'Transportation', method: 'UPI' },
  { pattern: /(indian\s*oil|ioc|bharat\s*petro|bpcl|hindustan\s*petro|hpcl|shell\s*petrol|fuel|petrol\s*pump)/i, title: 'Fuel / Petrol Refill', category: 'Transportation', method: 'Debit Card' },
  { pattern: /(irctc|indian\s*railway)/i, title: 'IRCTC Train Ticket', category: 'Transportation', method: 'Net Banking' },
  { pattern: /(indigo|air\s*india|spicejet|akasa|vistara)/i, title: 'Flight Booking', category: 'Transportation', method: 'Net Banking' },
  { pattern: /(makemytrip|cleartrip|yatra|easemytrip)/i, title: 'Travel Booking', category: 'Transportation', method: 'Net Banking' },

  // Shopping & E-Commerce
  { pattern: /(amazon|amzn)/i, title: 'Amazon Purchase', category: 'Shopping', method: 'Debit Card' },
  { pattern: /(flipkart)/i, title: 'Flipkart Shopping', category: 'Shopping', method: 'Debit Card' },
  { pattern: /(myntra)/i, title: 'Myntra Fashion', category: 'Shopping', method: 'UPI' },
  { pattern: /(ajio|reliance\s*retail)/i, title: 'Ajio Clothing', category: 'Shopping', method: 'UPI' },
  { pattern: /(meesho)/i, title: 'Meesho Order', category: 'Shopping', method: 'UPI' },
  { pattern: /(nykaa|fsn\s*e-commerce)/i, title: 'Nykaa Beauty', category: 'Shopping', method: 'UPI' },
  { pattern: /(croma|infiniti\s*retail)/i, title: 'Croma Electronics', category: 'Shopping', method: 'Debit Card' },
  { pattern: /(apple|apple\s*services)/i, title: 'Apple Services / Store', category: 'Shopping', method: 'Credit Card' },
  { pattern: /(decathlon)/i, title: 'Decathlon Sports', category: 'Shopping', method: 'Debit Card' },

  // Bills & Utilities
  { pattern: /(bescom|tata\s*power|adani\s*elec|mseb|electricity|power\s*distribution)/i, title: 'Electricity Bill', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(airtel|bharti\s*airtel)/i, title: 'Airtel Bill / Recharge', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(jio|reliance\s*jio)/i, title: 'Jio Telecom Recharge', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(vodafone|vi\s*prepaid|vodafone\s*idea)/i, title: 'Vi Recharge', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(act\s*fiber|broadband|hathway|wifi)/i, title: 'Broadband Bill', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(gas|igl|mgl|indraprastha|mahanagar\s*gas|hp\s*gas|indane)/i, title: 'Piped Gas / Cylinder', category: 'Bills & Utilities', method: 'UPI' },
  { pattern: /(water\s*board|bwssb|mcgm\s*water)/i, title: 'Water Bill', category: 'Bills & Utilities', method: 'Net Banking' },
  { pattern: /(credit\s*card\s*bill|cc\s*payment|cred\s*club)/i, title: 'Credit Card Bill Payment', category: 'Bills & Utilities', method: 'Net Banking' },

  // Rent & Housing
  { pattern: /(nobroker|cred\s*rent|house\s*rent|landlord|flat\s*maintenance|society\s*charges)/i, title: 'House Rent / Maintenance', category: 'Rent & Housing', method: 'Net Banking' },

  // Entertainment & Subscriptions
  { pattern: /(netflix)/i, title: 'Netflix Subscription', category: 'Entertainment', method: 'Credit Card' },
  { pattern: /(spotify)/i, title: 'Spotify Music', category: 'Entertainment', method: 'UPI' },
  { pattern: /(hotstar|disney)/i, title: 'Disney+ Hotstar', category: 'Entertainment', method: 'UPI' },
  { pattern: /(youtube|google\s*youtube)/i, title: 'YouTube Premium', category: 'Entertainment', method: 'UPI' },
  { pattern: /(bookmyshow|bigtree)/i, title: 'BookMyShow Movie Tickets', category: 'Entertainment', method: 'UPI' },
  { pattern: /(pvr|inox|cinepolis)/i, title: 'Cinema Movie Tickets', category: 'Entertainment', method: 'Debit Card' },

  // Health & Medical
  { pattern: /(apollo|apollo\s*pharmacy)/i, title: 'Apollo Pharmacy', category: 'Health & Medical', method: 'UPI' },
  { pattern: /(medplus)/i, title: 'MedPlus Medicines', category: 'Health & Medical', method: 'UPI' },
  { pattern: /(1mg|tata\s*1mg|pharmeasy)/i, title: 'Online Pharmacy', category: 'Health & Medical', method: 'UPI' },
  { pattern: /(practo|doctor|clinic|hospital|diagnostic)/i, title: 'Doctor Consultation / Clinic', category: 'Health & Medical', method: 'Debit Card' },
  { pattern: /(cult\.?fit|cure\.?fit|gym|fitness)/i, title: 'Cult.fit / Gym Membership', category: 'Health & Medical', method: 'UPI' },

  // Investments
  { pattern: /(zerodha|rainmatter)/i, title: 'Zerodha Funds Transfer', category: 'Investments', method: 'Net Banking' },
  { pattern: /(groww|nextbillion)/i, title: 'Groww Investments', category: 'Investments', method: 'Net Banking' },
  { pattern: /(angel\s*one|upstox|kuvera|coin)/i, title: 'Brokerage Investment', category: 'Investments', method: 'Net Banking' },
  { pattern: /(mutual\s*fund|nippon|uti\s*mf|hdfc\s*mf|icici\s*pru|parag\s*parikh)/i, title: 'Mutual Fund SIP', category: 'Investments', method: 'Net Banking' },

  // EMIs & Loans
  { pattern: /(emi|loan\s*repay|bajaj\s*fin|home\s*loan|car\s*loan)/i, title: 'Loan EMI Installment', category: 'EMI & Loans', method: 'Net Banking' },

  // Cash / ATM
  { pattern: /(atm|cash\s*wdl|nfs\s*cash)/i, title: 'ATM Cash Withdrawal', category: 'Other', method: 'Cash' },
]

export function cleanBankNarration(raw: string): {
  cleanedTitle: string
  suggestedCategory: string
  suggestedMethod: PaymentMethod
  isIncomeSuggested?: boolean
} {
  const text = (raw || '').trim()
  if (!text) {
    return {
      cleanedTitle: 'Bank Transaction',
      suggestedCategory: 'Other',
      suggestedMethod: 'UPI',
    }
  }

  // Check rule matches first
  for (const rule of NARRATION_RULES) {
    if (rule.pattern.test(text)) {
      return {
        cleanedTitle: rule.title,
        suggestedCategory: rule.category,
        suggestedMethod: rule.method,
        isIncomeSuggested: rule.isIncome,
      }
    }
  }

  // Handle UPI syntax: e.g. UPI/428192837412/SWIGGY/PAYTM... or UPI-MERCHANT-REF
  const upiMatch = text.match(/UPI[-/](?:\d+[-/])?([A-Za-z0-9\s._]+?)(?:[-/]|@|$)/i)
  if (upiMatch && upiMatch[1]) {
    const rawMerchant = upiMatch[1].replace(/[0-9]+/g, '').trim()
    if (rawMerchant.length >= 3) {
      const titleCase = rawMerchant
        .toLowerCase()
        .split(/[\s._]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return {
        cleanedTitle: `UPI: ${titleCase}`,
        suggestedCategory: 'Other',
        suggestedMethod: 'UPI',
      }
    }
  }

  // POS / Card match: e.g. POS/491029/SHOP NAME
  const posMatch = text.match(/POS[-/](?:\d+[-/])?([A-Za-z0-9\s._]+?)(?:[-/]|@|$)/i)
  if (posMatch && posMatch[1]) {
    return {
      cleanedTitle: posMatch[1].trim(),
      suggestedCategory: 'Shopping',
      suggestedMethod: 'Debit Card',
    }
  }

  // Fallback: Clean up multiple spaces, slashes and numbers
  const cleaned = text
    .replace(/[/\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    cleanedTitle: cleaned.length > 40 ? cleaned.slice(0, 37) + '...' : cleaned,
    suggestedCategory: 'Other',
    suggestedMethod: 'Net Banking',
  }
}

// ── 2. Robust CSV & Text Parser ──────────────────────────────

export function parseCSVToMatrix(text: string): string[][] {
  const lines = text.split(/\r\n|\n|\r/)
  const rows: string[][] = []

  // Check dominant delimiter on non-empty lines
  const sample = lines.slice(0, 10).join('\n')
  const commaCount = (sample.match(/,/g) || []).length
  const tabCount = (sample.match(/\t/g) || []).length
  const semicolonCount = (sample.match(/;/g) || []).length

  let delimiter = ','
  if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t'
  else if (semicolonCount > commaCount) delimiter = ';'

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l].trim()
    if (!rawLine) continue

    const row: string[] = []
    let inQuotes = false
    let currentCell = ''

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i]

      if (char === '"' || char === "'") {
        if (inQuotes && rawLine[i + 1] === char) {
          currentCell += char
          i++ // skip escaped quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentCell.trim())
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    row.push(currentCell.trim())

    // Skip rows that are purely empty or noise (e.g. asterisks or single non-data marks)
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row)
    }
  }

  return rows
}

// ── 3. Date & Currency String Parsers ────────────────────────

export function parseDateString(rawDate: string): string | null {
  if (!rawDate) return null
  const cleaned = rawDate.trim().replace(/['"]/g, '')

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = isoMatch[2].padStart(2, '0')
    const d = isoMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 2. Indian standard: DD/MM/YYYY or DD-MM-YYYY
  const inMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (inMatch) {
    const d = inMatch[1].padStart(2, '0')
    const m = inMatch[2].padStart(2, '0')
    const y = inMatch[3]
    return `${y}-${m}-${d}`
  }

  // 3. 2-digit year: DD/MM/YY or DD-MM-YY
  const shortYearMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/)
  if (shortYearMatch) {
    const d = shortYearMatch[1].padStart(2, '0')
    const m = shortYearMatch[2].padStart(2, '0')
    const y = `20${shortYearMatch[3]}`
    return `${y}-${m}-${d}`
  }

  // 4. Month name: DD-MMM-YYYY or DD MMM YYYY (e.g. 15-Oct-2026 or 15 Oct 2026)
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const nameMatch = cleaned.match(/^(\d{1,2})[-/\s]+([A-Za-z]{3,9})[-/\s]+(\d{2,4})/)
  if (nameMatch) {
    const d = nameMatch[1].padStart(2, '0')
    const monStr = nameMatch[2].slice(0, 3).toLowerCase()
    const m = monthNames[monStr]
    let y = nameMatch[3]
    if (y.length === 2) y = `20${y}`
    if (m) {
      return `${y}-${m}-${d}`
    }
  }

  return null
}

export function parseAmountString(rawAmount: string | undefined): number {
  if (!rawAmount) return 0
  const cleaned = rawAmount
    .replace(/[₹$,\s]/g, '')
    .replace(/Dr|Cr|dr|cr/gi, '')
    .trim()

  // Handle parenthesized numbers e.g. (1500)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const inner = cleaned.slice(1, -1)
    const val = parseFloat(inner)
    return isNaN(val) ? 0 : Math.abs(val)
  }

  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.abs(val)
}

// ── 4. Bank Profile Detection & Header Identification ────────

export function detectBankProfile(headers: string[]): BankPresetId {
  const joined = headers.join(' ').toLowerCase()

  if (joined.includes('chq/ref no') || (joined.includes('narration') && joined.includes('withdrawal amt'))) {
    return 'hdfc'
  }
  if (joined.includes('txn date') && (joined.includes('ref no./cheque no.') || joined.includes('description'))) {
    return 'sbi'
  }
  if (joined.includes('transaction remarks') || (joined.includes('withdrawal amount (inr)') && joined.includes('deposit amount (inr)'))) {
    return 'icici'
  }
  if (joined.includes('particulars') && joined.includes('chqno') && joined.includes('dr')) {
    return 'axis'
  }
  if (joined.includes('kotak') || (joined.includes('chq / ref no.') && joined.includes('dr / cr'))) {
    return 'kotak'
  }

  return 'generic'
}

export function detectColumnMapping(headers: string[]): StatementColumnMapping {
  let dateIndex = -1
  let narrationIndex = -1
  let withdrawalIndex = -1
  let depositIndex = -1
  let amountIndex = -1
  let typeIndex = -1
  let refIndex = -1
  let balanceIndex = -1

  headers.forEach((h, idx) => {
    const low = h.toLowerCase().trim()

    // Date
    if (dateIndex === -1 && (low.includes('date') || low === 'txn dt' || low === 'tran date' || low === 'value dt')) {
      dateIndex = idx
    }

    // Narration / Description
    if (narrationIndex === -1 && (low.includes('narration') || low.includes('description') || low.includes('particulars') || low.includes('remarks') || low.includes('details'))) {
      narrationIndex = idx
    }

    // Withdrawal / Debit
    if (withdrawalIndex === -1 && (low.includes('withdrawal') || low === 'debit' || low === 'dr' || low.includes('debit amt') || low.includes('withdrawal amt'))) {
      withdrawalIndex = idx
    }

    // Deposit / Credit
    if (depositIndex === -1 && (low.includes('deposit') || low === 'credit' || low === 'cr' || low.includes('credit amt') || low.includes('deposit amt'))) {
      depositIndex = idx
    }

    // Unified Amount
    if (amountIndex === -1 && (low === 'amount' || low === 'txn amount' || low === 'amount (inr)' || low === 'transaction amount')) {
      amountIndex = idx
    }

    // Type (Dr/Cr)
    if (typeIndex === -1 && (low === 'type' || low === 'dr/cr' || low === 'dr / cr' || low === 'cr/dr' || low === 'txn type')) {
      typeIndex = idx
    }

    // Reference
    if (refIndex === -1 && (low.includes('ref') || low.includes('chq') || low.includes('cheque') || low.includes('utr'))) {
      refIndex = idx
    }

    // Balance
    if (balanceIndex === -1 && (low.includes('balance') || low === 'bal')) {
      balanceIndex = idx
    }
  })

  // Fallbacks if columns are not named typically
  if (dateIndex === -1) dateIndex = 0
  if (narrationIndex === -1) narrationIndex = Math.min(1, headers.length - 1)

  return {
    dateIndex,
    narrationIndex,
    withdrawalIndex,
    depositIndex,
    amountIndex: amountIndex !== -1 ? amountIndex : undefined,
    typeIndex: typeIndex !== -1 ? typeIndex : undefined,
    refIndex: refIndex !== -1 ? refIndex : undefined,
    balanceIndex: balanceIndex !== -1 ? balanceIndex : undefined,
  }
}

// ── 5. Main Statement Parser Engine ──────────────────────────

export function parseBankStatement(
  rawInput: string,
  preset: BankPresetId = 'auto',
  existingTransactions: Transaction[] = [],
  targetAccountId = ''
): StatementParseResult {
  const errors: string[] = []
  const transactions: ParsedRawTransaction[] = []

  if (!rawInput || !rawInput.trim()) {
    return {
      transactions: [],
      detectedBank: 'generic',
      totalCount: 0,
      duplicateCount: 0,
      totalInflow: 0,
      totalOutflow: 0,
      headers: [],
      rows: [],
      errors: ['Statement content is empty. Please upload a file or paste text.'],
    }
  }

  const matrix = parseCSVToMatrix(rawInput)
  if (matrix.length < 2) {
    return {
      transactions: [],
      detectedBank: 'generic',
      totalCount: 0,
      duplicateCount: 0,
      totalInflow: 0,
      totalOutflow: 0,
      headers: [],
      rows: matrix,
      errors: ['Statement must contain a header row and at least one transaction row.'],
    }
  }

  // Find header row: scan first 10 rows for a row that has date/narration keywords
  let headerRowIndex = 0
  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const rowStr = matrix[r].join(' ').toLowerCase()
    if (
      (rowStr.includes('date') || rowStr.includes('dt')) &&
      (rowStr.includes('narration') || rowStr.includes('particulars') || rowStr.includes('description') || rowStr.includes('amount') || rowStr.includes('debit'))
    ) {
      headerRowIndex = r
      break
    }
  }

  const headers = matrix[headerRowIndex]
  const dataRows = matrix.slice(headerRowIndex + 1)

  // Determine bank profile
  const detectedBank = preset === 'auto' ? detectBankProfile(headers) : preset
  const mapping = detectColumnMapping(headers)

  let totalInflow = 0
  let totalOutflow = 0
  let duplicateCount = 0

  dataRows.forEach((row, rowIdx) => {
    // Skip empty or short rows
    if (row.length < 2) return

    const rawDate = row[mapping.dateIndex] || ''
    const parsedDate = parseDateString(rawDate)
    if (!parsedDate) {
      // Row probably isn't a transaction (e.g. table footer, summary, opening balance line)
      return
    }

    const rawNarration = row[mapping.narrationIndex] || 'Bank Transaction'
    let type: 'expense' | 'income' = 'expense'
    let amount = 0

    // Mode A: Separate Withdrawal & Deposit columns
    if (mapping.withdrawalIndex !== -1 && mapping.depositIndex !== -1) {
      const withdrawalRaw = row[mapping.withdrawalIndex]
      const depositRaw = row[mapping.depositIndex]

      const withdrawal = parseAmountString(withdrawalRaw)
      const deposit = parseAmountString(depositRaw)

      if (deposit > 0 && withdrawal === 0) {
        type = 'income'
        amount = deposit
      } else if (withdrawal > 0) {
        type = 'expense'
        amount = withdrawal
      } else if (deposit > 0) {
        // Both non-zero, choose larger or default to deposit
        type = 'income'
        amount = deposit
      }
    }
    // Mode B: Single Amount column + Type column (DR / CR)
    else if (mapping.amountIndex !== undefined && mapping.amountIndex !== -1) {
      amount = parseAmountString(row[mapping.amountIndex])
      if (mapping.typeIndex !== undefined && mapping.typeIndex !== -1) {
        const typeCell = (row[mapping.typeIndex] || '').toLowerCase()
        if (typeCell.includes('cr') || typeCell.includes('credit') || typeCell.includes('deposit') || typeCell.includes('+')) {
          type = 'income'
        } else {
          type = 'expense'
        }
      }
    }
    // Mode C: Check withdrawal only or deposit only
    else if (mapping.withdrawalIndex !== -1) {
      amount = parseAmountString(row[mapping.withdrawalIndex])
      type = 'expense'
    } else if (mapping.depositIndex !== -1) {
      amount = parseAmountString(row[mapping.depositIndex])
      type = 'income'
    }

    // Skip rows with zero or invalid amount
    if (amount <= 0) return

    const { cleanedTitle, suggestedCategory, suggestedMethod, isIncomeSuggested } =
      cleanBankNarration(rawNarration)

    // Override type if narration clearly signals income (e.g. Salary, Interest)
    if (isIncomeSuggested && type === 'expense' && mapping.depositIndex === -1 && mapping.typeIndex === undefined) {
      type = 'income'
    }

    const referenceNo =
      mapping.refIndex !== undefined && mapping.refIndex !== -1
        ? row[mapping.refIndex]?.trim()
        : undefined

    const balance =
      mapping.balanceIndex !== undefined && mapping.balanceIndex !== -1
        ? parseAmountString(row[mapping.balanceIndex])
        : undefined

    // Check for duplicate against existing user transactions
    const isDuplicate = existingTransactions.some((tx) => {
      const dateMatches = tx.date === parsedDate
      const amountMatches = Math.abs(tx.amount - amount) < 0.01
      const accountMatches = !targetAccountId || tx.accountId === targetAccountId
      return dateMatches && amountMatches && accountMatches
    })

    if (isDuplicate) {
      duplicateCount++
    }

    if (type === 'income') {
      totalInflow += amount
    } else {
      totalOutflow += amount
    }

    transactions.push({
      id: `imported-${Date.now()}-${rowIdx}`,
      date: parsedDate,
      rawNarration,
      cleanedTitle,
      type,
      amount,
      category: suggestedCategory,
      paymentMethod: suggestedMethod,
      referenceNo,
      balance,
      isDuplicate,
      selected: !isDuplicate, // Automatically deselect duplicates
    })
  })

  return {
    transactions,
    detectedBank,
    totalCount: transactions.length,
    duplicateCount,
    totalInflow: Math.round(totalInflow * 100) / 100,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    headers,
    rows: dataRows,
    errors,
  }
}

// ── 6. Sample Statement Templates for Demo & Testing ─────────

export const SAMPLE_HDFC_CSV = `Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
01/10/2026,SALARY CREDITED PVT LTD,NEFT-00129384,01/10/2026,,65000.00,113500.00
02/10/2026,UPI/428198273612/SWIGGY/PAYTM,UPI-4281982,02/10/2026,450.00,,113050.00
03/10/2026,UPI/128731928312/UBER/HDFC,UPI-1287319,03/10/2026,280.00,,112770.00
04/10/2026,POS/AMAZON INDIA RETAIL/49281,POS-492810,04/10/2026,1899.00,,110871.00
05/10/2026,BESCOM ELECTRICITY BILL/BANGALORE,BILL-89210,05/10/2026,1420.00,,109451.00
06/10/2026,UPI/981273918237/BLINKIT/INSTANT,UPI-9812739,06/10/2026,640.00,,108811.00
07/10/2026,INT.PD: 01-07-2026 to 30-09-2026,INT-Q2-26,07/10/2026,,425.00,109236.00
08/10/2026,ZERODHA BROKING LTD FUNDS TRF,NEFT-991204,08/10/2026,10000.00,,99236.00`

export const SAMPLE_SBI_CSV = `Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01-10-2026,01-10-2026,NEFT*SALARY*GLOBAL TECH CORP,SBIN0019283,,72000.00,86200.00
02-10-2026,02-10-2026,TO TRANSFER-UPI/DR/481928/ZOMATO/PAY,UPI4819281,380.00,,85820.00
03-10-2026,03-10-2026,ATM-WDL/KORAMANGALA SBI ATM/BANGALORE,ATM19283,2000.00,,83820.00
04-10-2026,04-10-2026,TO TRANSFER-UPI/DR/129841/AIRTEL/PAY,UPI1298410,999.00,,82821.00
05-10-2026,05-10-2026,INTEREST CREDIT FOR QUARTER,INT910283,,310.00,83131.00`

export const SAMPLE_GENERIC_CSV = `Date,Description,Amount,Type,Category
2026-10-01,Freelance Client Retainer,15000,Credit,Income
2026-10-02,Starbucks Coffee MG Road,320,Debit,Food & Dining
2026-10-03,Petrol Shell Whitefield,1500,Debit,Transportation
2026-10-04,Netflix Subscription,649,Debit,Entertainment
2026-10-05,Apollo Pharmacy Medicines,450,Debit,Health & Medical`
