import { useState } from 'react'
import styles from '@views/Home/Home.module.scss'

type ValueType = 'percentage' | 'amount'
type Frequency = 'monthly' | 'yearly'
type ComparisonPeriod = 'yearly' | 'monthly'
type StudentLoanPlan =
  | 'none'
  | 'plan1'
  | 'plan2'
  | 'plan4'
  | 'plan5'

type TaxRegion = 'rUK' | 'scotland'

type TaxBand = {
  label: string
  rate: number
  amount: number
  taxableAmount: number
}

type NiBand = {
  label: string
  rate: number
  amount: number
  taxableAmount: number
  lower: number
  upper: number
}

type CalculationResult = {
  basicSalary: number
  taxableAdditions: number
  grossWage: number
  bonus: number
  employeePension: number
  employerPension: number
  salarySacrifice: number
  nationalInsurance: number
  tax: number
  studentLoan: number
  postgraduateLoan: number
  takeHomePay: number
  personalAllowance: number
  taxBands: TaxBand[]
  niBands: NiBand[]
}

type ScenarioResult = {
  tax: number
  nationalInsurance: number
  studentLoan: number
  postgraduateLoan: number
  governmentDeductions: number
  takeHomePay: number
  taxBands: TaxBand[]
  niBands: NiBand[]
}

const studentLoanDescriptions = {
  plan1:
    'NI & pre-2012 England & Wales',

  plan2:
    'England (2012-2022) & Wales post-2012.',

  plan4:
    'Scotland post-1998.',

  plan5:
    'England post-2023.',
}

const STUDENT_LOAN_THRESHOLDS: Record<
  Exclude<StudentLoanPlan, 'none'>,
  number
> = {
  plan1: 26900,
  plan2: 29385,
  plan4: 33795,
  plan5: 25000,
}

const PERSONAL_ALLOWANCE = 12570

const Home = () => {
  const [grossIncome, setGrossIncome] = useState('')

  /*
   * Pension
   *
   * The employee and employer contributions share the same
   * frequency and £/% selector, but have separate input boxes.
   */
  const [pensionType, setPensionType] =
    useState<ValueType>('percentage')

  const [pensionFrequency, setPensionFrequency] =
    useState<Frequency>('yearly')

  const [employeePensionValue, setEmployeePensionValue] =
    useState('')

  const [employerPensionValue, setEmployerPensionValue] =
    useState('')

  /*
   * Whether employee pension contributions are made via
   * salary sacrifice, which also reduces NI and Student Loan
   * earnings (unlike a standard net-pay arrangement).
   */
  const [employeePensionIsSalarySacrifice, setEmployeePensionIsSalarySacrifice] =
    useState(true)

  const [studentLoan, setStudentLoan] =
    useState<StudentLoanPlan>('none')

  const [postgraduateLoan, setPostgraduateLoan] =
    useState(false)

  const [preTaxFrequency, setPreTaxFrequency] =
    useState<Frequency>('yearly')

  const [preTaxValue, setPreTaxValue] = useState('')

  const [salarySacrificeType, setSalarySacrificeType] =
    useState<ValueType>('percentage')

  const [salarySacrificeFrequency, setSalarySacrificeFrequency] =
    useState<Frequency>('yearly')

  const [salarySacrificeValue, setSalarySacrificeValue] =
    useState('')

  /*
   * Bonus
   *
   * Percentage = percentage of annual gross salary.
   * Amount = annual bonus.
   */
  const [bonusType, setBonusType] =
    useState<ValueType>('percentage')

  const [bonusValue, setBonusValue] = useState('')

  /*
   * Tax region is required because Scottish Income Tax
   * uses different bands.
   */
  const [taxRegion, setTaxRegion] =
    useState<TaxRegion>('rUK')

  const [calculation, setCalculation] =
    useState<CalculationResult | null>(null)

  const [comparisonPeriod, setComparisonPeriod] =
    useState<ComparisonPeriod>('yearly')

  const [error, setError] = useState('')

  /*
   * Convert a monthly/yearly input into an annual amount.
   */
  const annualise = (
    value: string,
    frequency: Frequency
  ): number => {
    const numericValue = Number(value) || 0

    return frequency === 'monthly'
      ? numericValue * 12
      : numericValue
  }

  /*
   * Employee / employer pension contribution.
   *
   * Percentage is based on annual gross salary.
   */
  const calculatePensionAmount = (
    value: string,
    type: ValueType,
    frequency: Frequency,
    annualGross: number
  ): number => {
    const numericValue = Number(value) || 0

    if (type === 'percentage') {
      return annualGross * (numericValue / 100)
    }

    return annualise(value, frequency)
  }

  /*
   * Bonus calculation.
   *
   * A percentage bonus is calculated against annual gross salary.
   * A monetary bonus is treated as an annual amount.
   */
  const calculateBonus = (
    value: string,
    type: ValueType,
    annualGross: number
  ): number => {
    const numericValue = Number(value) || 0

    if (type === 'percentage') {
      return annualGross * (numericValue / 100)
    }

    return numericValue
  }

  /*
   * Calculate the employee's Personal Allowance.
   *
   * Standard allowance = £12,570.
   *
   * Above £100,000 adjusted net income:
   * allowance is reduced by £1 for every £2 above £100,000.
   *
   * It reaches £0 at £125,140.
   */
  const calculatePersonalAllowance = (
    adjustedNetIncome: number
  ): number => {
    if (adjustedNetIncome <= 100000) {
      return PERSONAL_ALLOWANCE
    }

    if (adjustedNetIncome >= 125140) {
      return 0
    }

    const reduction =
      (adjustedNetIncome - 100000) / 2

    return Math.max(
      0,
      PERSONAL_ALLOWANCE - reduction
    )
  }

  /*
   * England / Wales / Northern Ireland tax calculation.
   *
   * The tax bands are applied to income after the
   * Personal Allowance:
   *
   * £0 - £37,700   = 20%
   * £37,700+       = 40%
   * £125,140+      = 45%
   */
  const calculateRUKTaxBands = (
    taxableIncome: number
  ): TaxBand[] => {
    const bands: TaxBand[] = []

    const basicAmount = Math.min(
      taxableIncome,
      37700
    )

    const higherAmount = Math.min(
      Math.max(taxableIncome - 37700, 0),
      125140 - 37700
    )

    const additionalAmount = Math.max(
      taxableIncome - 125140,
      0
    )

    bands.push({
      label: '20% Tax',
      rate: 20,
      amount: basicAmount * 0.2,
      taxableAmount: basicAmount,
    })

    bands.push({
      label: '40% Tax',
      rate: 40,
      amount: higherAmount * 0.4,
      taxableAmount: higherAmount,
    })

    bands.push({
      label: '45% Tax',
      rate: 45,
      amount: additionalAmount * 0.45,
      taxableAmount: additionalAmount,
    })

    return bands
  }

  /*
   * Scottish Income Tax.
   *
   * 2026/27:
   *
   * £0 - £3,967       19%
   * £3,967 - £16,956  20%
   * £16,956 - £31,092 21%
   * £31,092 - £62,430 42%
   * £62,430 - £125,140 45%
   * £125,140+         48%
   */
  const calculateScottishTaxBands = (
    taxableIncome: number
  ): TaxBand[] => {
    const bands = [
      {
        label: '19% Tax',
        rate: 19,
        lower: 0,
        upper: 3967,
      },
      {
        label: '20% Tax',
        rate: 20,
        lower: 3967,
        upper: 16956,
      },
      {
        label: '21% Tax',
        rate: 21,
        lower: 16956,
        upper: 31092,
      },
      {
        label: '42% Tax',
        rate: 42,
        lower: 31092,
        upper: 62430,
      },
      {
        label: '45% Tax',
        rate: 45,
        lower: 62430,
        upper: 125140,
      },
      {
        label: '48% Tax',
        rate: 48,
        lower: 125140,
        upper: Infinity,
      },
    ]

    return bands.map((band) => {
      const amount = Math.max(
        Math.min(taxableIncome, band.upper) -
          band.lower,
        0
      )

      return {
        label: band.label,
        rate: band.rate,
        amount: amount * (band.rate / 100),
        taxableAmount: amount,
      }
    })
  }

  /*
   * Calculate Income Tax.
   *
   * taxableIncome here is income AFTER the Personal Allowance.
   */
  const calculateTax = (
    taxableIncome: number,
    region: TaxRegion
  ): {
    tax: number
    taxBands: TaxBand[]
  } => {
    if (taxableIncome <= 0) {
      return {
        tax: 0,
        taxBands:
          region === 'scotland'
            ? calculateScottishTaxBands(0)
            : calculateRUKTaxBands(0),
      }
    }

    const taxBands =
      region === 'scotland'
        ? calculateScottishTaxBands(taxableIncome)
        : calculateRUKTaxBands(taxableIncome)

    const tax = taxBands.reduce(
      (total, band) => total + band.amount,
      0
    )

    return {
      tax,
      taxBands,
    }
  }

  /*
   * Calculate employee National Insurance.
   *
   * 2026/27:
   *
   * £0 - £12,570     = 0%
   * £12,570-£50,268  = 8%
   * £50,268+         = 2%
   *
   * Salary sacrifice always reduces NI earnings; employee pension
   * only does so when treated as salary sacrifice (see toggle).
   */
  const calculateNationalInsuranceBands = (
    niEarnings: number
  ): NiBand[] => {
    const primaryThreshold = 12570
    const upperEarningsLimit = 50268

    const bands = [
      {
        label: '0% NI',
        rate: 0,
        lower: 0,
        upper: primaryThreshold,
      },
      {
        label: '8% NI',
        rate: 8,
        lower: primaryThreshold,
        upper: upperEarningsLimit,
      },
      {
        label: '2% NI',
        rate: 2,
        lower: upperEarningsLimit,
        upper: Infinity,
      },
    ]

    return bands.map((band) => {
      const amount = Math.max(
        Math.min(niEarnings, band.upper) - band.lower,
        0
      )

      return {
        label: band.label,
        rate: band.rate,
        amount: amount * (band.rate / 100),
        taxableAmount: amount,
        lower: band.lower,
        upper: band.upper,
      }
    })
  }

  /*
   * Student loan calculation.
   *
   * Plans 1, 2, 4 and 5 = 9%
   * Postgraduate = 6%
   */
  const calculateStudentLoan = (
    earnings: number
  ): number => {
    if (studentLoan === 'none') {
      return 0
    }

    const threshold =
      STUDENT_LOAN_THRESHOLDS[studentLoan]

    return Math.max(
      earnings - threshold,
      0
    ) * 0.09
  }

  const calculatePostgraduateLoan = (
    earnings: number
  ): number => {
    if (!postgraduateLoan) {
      return 0
    }

    const threshold = 21000

    return Math.max(
      earnings - threshold,
      0
    ) * 0.06
  }

  const governmentDeductions = (
    tax: number,
    nationalInsurance: number,
    studentLoanAmount: number,
    postgraduateLoanAmount: number
  ): number =>
    tax +
    nationalInsurance +
    studentLoanAmount +
    postgraduateLoanAmount

  const calculateScenario = (
    grossWage: number,
    salarySacrifice: number,
    employeePension: number
  ): ScenarioResult => {
    const safeSalarySacrifice = Math.min(
      salarySacrifice,
      grossWage
    )
    const safeEmployeePension = Math.min(
      employeePension,
      Math.max(grossWage - safeSalarySacrifice, 0)
    )
    const adjustedNetIncome = Math.max(
      grossWage - safeSalarySacrifice - safeEmployeePension,
      0
    )
    const personalAllowance =
      calculatePersonalAllowance(adjustedNetIncome)
    const taxableIncome = Math.max(
      adjustedNetIncome - personalAllowance,
      0
    )
    const { tax, taxBands } = calculateTax(taxableIncome, taxRegion)
    const niReducingDeductions =
      safeSalarySacrifice +
      (employeePensionIsSalarySacrifice ? safeEmployeePension : 0)
    const niEarnings = Math.max(
      grossWage - niReducingDeductions,
      0
    )
    const niBands = calculateNationalInsuranceBands(niEarnings)
    const nationalInsurance = niBands.reduce(
      (total, band) => total + band.amount,
      0
    )
    const studentLoanAmount = calculateStudentLoan(niEarnings)
    const postgraduateLoanAmount =
      calculatePostgraduateLoan(niEarnings)

    return {
      tax,
      nationalInsurance,
      studentLoan: studentLoanAmount,
      postgraduateLoan: postgraduateLoanAmount,
      niBands,
      governmentDeductions: governmentDeductions(
        tax,
        nationalInsurance,
        studentLoanAmount,
        postgraduateLoanAmount
      ),
      taxBands,
      takeHomePay: Math.max(
        grossWage -
          safeSalarySacrifice -
          safeEmployeePension -
          tax -
          nationalInsurance -
          studentLoanAmount -
          postgraduateLoanAmount,
        0
      ),
    }
  }

  /*
   * Main calculation.
   */
  const handleCalculate = () => {
    setError('')
    setCalculation(null)

    const annualGrossSalary = Number(grossIncome) || 0

    if (annualGrossSalary <= 0) {
      setError(
        'Please enter a yearly gross income greater than £0.'
      )
      return
    }

    const annualPreTaxAdditions = annualise(
      preTaxValue,
      preTaxFrequency
    )
    const annualSalarySacrifice = calculatePensionAmount(
      salarySacrificeValue,
      salarySacrificeType,
      salarySacrificeFrequency,
      annualGrossSalary
    )
    const annualBonus = calculateBonus(
      bonusValue,
      bonusType,
      annualGrossSalary
    )
    const grossWage =
      annualGrossSalary + annualBonus + annualPreTaxAdditions
    const employeePension = calculatePensionAmount(
      employeePensionValue,
      pensionType,
      pensionFrequency,
      annualGrossSalary
    )
    const employerPension = calculatePensionAmount(
      employerPensionValue,
      pensionType,
      pensionFrequency,
      annualGrossSalary
    )
    const scenario = calculateScenario(
      grossWage,
      annualSalarySacrifice,
      employeePension
    )
    const safeSalarySacrifice = Math.min(
      annualSalarySacrifice,
      grossWage
    )
    const safeEmployeePension = Math.min(
      employeePension,
      Math.max(grossWage - safeSalarySacrifice, 0)
    )
    const adjustedNetIncome = Math.max(
      grossWage - safeSalarySacrifice - safeEmployeePension,
      0
    )
    const personalAllowance =
      calculatePersonalAllowance(adjustedNetIncome)
    const taxableIncome = Math.max(
      adjustedNetIncome - personalAllowance,
      0
    )
    const { taxBands } = calculateTax(taxableIncome, taxRegion)

    setCalculation({
      basicSalary: annualGrossSalary,
      taxableAdditions: annualPreTaxAdditions,
      grossWage,
      bonus: annualBonus,
      employeePension: safeEmployeePension,
      employerPension,
      salarySacrifice: safeSalarySacrifice,
      nationalInsurance: scenario.nationalInsurance,
      tax: scenario.tax,
      studentLoan: scenario.studentLoan,
      postgraduateLoan: scenario.postgraduateLoan,
      takeHomePay: scenario.takeHomePay,
      personalAllowance,
      taxBands,
      niBands: scenario.niBands,
    })
  }

  const formatCurrency = (
    amount: number
  ): string => {
    return new Intl.NumberFormat(
      'en-GB',
      {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(amount)
  }

  const monthly = (annual: number): number =>
    annual / 12

  const scenarioValues = calculation
    ? {
        current: calculateScenario(
          calculation.grossWage,
          calculation.salarySacrifice,
          calculation.employeePension
        ),
        noSalarySacrifice: calculateScenario(
          calculation.grossWage,
          0,
          calculation.employeePension
        ),
        noPension: calculateScenario(
          calculation.grossWage,
          calculation.salarySacrifice,
          0
        ),
        neither: calculateScenario(
          calculation.grossWage,
          0,
          0
        ),
        regularMonth: calculateScenario(
          calculation.grossWage - calculation.bonus,
          calculation.salarySacrifice,
          calculation.employeePension
        ),
      }
    : null

  const bonusMonthValue = (
    annual: number,
    regularMonth: number
  ): number => annual - monthly(regularMonth) * 11

  const regularGrossWage = calculation
    ? calculation.grossWage - calculation.bonus
    : 0

  const regularGovernmentDeductions =
    scenarioValues?.regularMonth.governmentDeductions ?? 0

  const totalGovernmentDeductions = calculation
    ? governmentDeductions(
        calculation.tax,
        calculation.nationalInsurance,
        calculation.studentLoan,
        calculation.postgraduateLoan
      )
    : 0

  const comparisonScenarios = calculation && scenarioValues
    ? [
        {
          label: 'Current setup',
          annual: scenarioValues.current,
          regular: scenarioValues.regularMonth,
          pension: calculation.employeePension + calculation.employerPension,
          salarySacrifice: calculation.salarySacrifice,
        },
        {
          label: 'No salary sacrifice',
          annual: scenarioValues.noSalarySacrifice,
          regular: calculateScenario(
            regularGrossWage,
            0,
            calculation.employeePension
          ),
          pension: calculation.employeePension + calculation.employerPension,
          salarySacrifice: 0,
        },
        {
          label: 'No pension',
          annual: scenarioValues.noPension,
          regular: calculateScenario(
            regularGrossWage,
            calculation.salarySacrifice,
            0
          ),
          pension: 0,
          salarySacrifice: calculation.salarySacrifice,
        },
        {
          label: 'No pension or salary sacrifice',
          annual: scenarioValues.neither,
          regular: calculateScenario(regularGrossWage, 0, 0),
          pension: 0,
          salarySacrifice: 0,
        },
      ]
    : []

  return (
    <div className={styles.PageContainer}>
      <div className={styles.TitleContainer}>
        <h1 className={styles.Title}>
          Welcome to the Simple Tax Calculator
        </h1>

        <h2>
          Please input details below to begin.
        </h2>
      </div>

      <form
        className={styles.Form}
        onSubmit={(event) => {
          event.preventDefault()
          handleCalculate()
        }}
      >
        {/* --------------------------------
            Gross Income
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="grossIncome">
            Yearly Gross Income{' '}
            <span>(pre-tax)</span>
          </label>

          <div className={styles.InputRow}>
            <div className={styles.InputWithPrefix}>
              <span>£</span>

              <input
                id="grossIncome"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 40000"
                value={grossIncome}
                onChange={(e) =>
                  setGrossIncome(
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* --------------------------------
            Tax Region
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="taxRegion">
            Tax Region
          </label>

          <div className={styles.InputRow}>
            <select
              id="taxRegion"
              value={taxRegion}
              onChange={(e) =>
                setTaxRegion(
                  e.target.value as TaxRegion
                )
              }
            >
              <option value="rUK">
                England, Wales & Northern Ireland
              </option>

              <option value="scotland">
                Scotland
              </option>
            </select>
          </div>

          <p className={styles.HelpText}>
            This affects the Income Tax bands used
            in the calculation.
          </p>
        </div>

        {/* --------------------------------
            Pension
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label>Pension Contributions</label>

          <div className={styles.PensionControls}>
            <div>
              <span className={styles.ControlLabel}>
                Contribution type
              </span>

              <div className={styles.Toggle}>
                <button
                  type="button"
                  className={
                    pensionType === 'amount'
                      ? styles.Active
                      : ''
                  }
                  onClick={() =>
                    setPensionType('amount')
                  }
                >
                  £
                </button>

                <button
                  type="button"
                  className={
                    pensionType === 'percentage'
                      ? styles.Active
                      : ''
                  }
                  onClick={() =>
                    setPensionType('percentage')
                  }
                >
                  %
                </button>
              </div>
            </div>

            {pensionType === 'amount' && (
              <div className={styles.PensionFrequency}>
                <span className={styles.ControlLabel}>
                  Frequency
                </span>

                <select
                  value={pensionFrequency}
                  onChange={(e) =>
                    setPensionFrequency(
                      e.target.value as Frequency
                    )
                  }
                  aria-label="Pension frequency"
                >
                  <option value="monthly">
                    Monthly
                  </option>

                  <option value="yearly">
                    Yearly
                  </option>
                </select>
              </div>
            )}
          </div>

          <div className={styles.PensionInputs}>
            {/* Employee pension */}

            <div className={styles.PensionBox}>
              <label htmlFor="employeePension">
                Employee Contribution
              </label>

              <div
                className={
                  styles.InputWithPrefix
                }
              >
                <span>
                  {pensionType ===
                  'percentage'
                    ? '%'
                    : '£'}
                </span>

                <input
                  id="employeePension"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    pensionType ===
                    'percentage'
                      ? 'e.g. 5'
                      : 'e.g. 200'
                  }
                  value={
                    employeePensionValue
                  }
                  onChange={(e) =>
                    setEmployeePensionValue(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            {/* Employer pension */}

            <div className={styles.PensionBox}>
              <label htmlFor="employerPension">
                Employer Contribution
              </label>

              <div
                className={
                  styles.InputWithPrefix
                }
              >
                <span>
                  {pensionType ===
                  'percentage'
                    ? '%'
                    : '£'}
                </span>

                <input
                  id="employerPension"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    pensionType ===
                    'percentage'
                      ? 'e.g. 3'
                      : 'e.g. 100'
                  }
                  value={
                    employerPensionValue
                  }
                  onChange={(e) =>
                    setEmployerPensionValue(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>

          <label
            className={styles.CheckboxLabel}
          >
            <input
              type="checkbox"
              checked={
                employeePensionIsSalarySacrifice
              }
              onChange={(e) =>
                setEmployeePensionIsSalarySacrifice(
                  e.target.checked
                )
              }
            />

            <span>
              Employee pension is salary sacrifice
            </span>
          </label>

          <p className={styles.HelpText}>
            Employee pension contributions always
            reduce Income Tax. When treated as
            salary sacrifice, they also reduce NI
            and Student Loan earnings. Employer
            contributions do not reduce your
            take-home pay.
          </p>
        </div>

        {/* --------------------------------
            Bonus
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="bonusValue">
            Bonus
          </label>

          <div className={styles.InputRow}>
            <div
              className={
                styles.InputWithPrefix
              }
            >
              <span>
                {bonusType === 'percentage'
                  ? '%'
                  : '£'}
              </span>

              <input
                id="bonusValue"
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  bonusType === 'percentage'
                    ? 'e.g. 10'
                    : 'e.g. 3000'
                }
                value={bonusValue}
                onChange={(e) =>
                  setBonusValue(
                    e.target.value
                  )
                }
              />
            </div>

            <div className={styles.Toggle}>
              <button
                type="button"
                className={
                  bonusType === 'amount'
                    ? styles.Active
                    : ''
                }
                onClick={() =>
                  setBonusType('amount')
                }
              >
                £
              </button>

              <button
                type="button"
                className={
                  bonusType ===
                  'percentage'
                    ? styles.Active
                    : ''
                }
                onClick={() =>
                  setBonusType(
                    'percentage'
                  )
                }
              >
                %
              </button>
            </div>
          </div>

          <p className={styles.HelpText}>
            A percentage bonus is calculated from
            your yearly gross salary. A monetary
            bonus is treated as an annual bonus.
          </p>
        </div>

        {/* --------------------------------
            Student Loan
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="studentLoan">
            Student Loan
          </label>

          <div className={styles.InputRow}>
            <select
              id="studentLoan"
              className={
                styles.StudentLoanSelect
              }
              value={studentLoan}
              onChange={(e) =>
                setStudentLoan(
                  e.target.value as StudentLoanPlan
                )
              }
            >
              <option value="none">
                No Loan
              </option>

              <option value="plan1">
                Plan 1
              </option>

              <option value="plan2">
                Plan 2
              </option>

              <option value="plan4">
                Plan 4
              </option>

              <option value="plan5">
                Plan 5
              </option>
            </select>

            <div
              className={
                styles.InfoContainer
              }
            >
              <button
                type="button"
                className={
                  styles.InfoButton
                }
                aria-label="Student loan plan information"
              >
                i
              </button>

              <div
                className={
                  styles.InfoBox
                }
              >
                <strong>
                  Student Loan Plans
                </strong>

                <p>
                  <strong>
                    Plan 1
                  </strong>
                  <br />
                  {
                    studentLoanDescriptions.plan1
                  }
                </p>

                <p>
                  <strong>
                    Plan 2
                  </strong>
                  <br />
                  {
                    studentLoanDescriptions.plan2
                  }
                </p>

                <p>
                  <strong>
                    Plan 4
                  </strong>
                  <br />
                  {
                    studentLoanDescriptions.plan4
                  }
                </p>

                <p>
                  <strong>
                    Plan 5
                  </strong>
                  <br />
                  {
                    studentLoanDescriptions.plan5
                  }
                </p>

                <p>
                  <strong>
                    Postgraduate Loan
                  </strong>
                  <br />
                  A separate loan repayment
                  for postgraduate studies.
                  Applies in addition to an
                  undergraduate student loan.
                </p>
              </div>
            </div>
          </div>

          <div
            className={
              styles.PostgraduateOption
            }
          >
            <label
              htmlFor="postgraduateLoan"
              className={
                styles.CheckboxLabel
              }
            >
              <input
                id="postgraduateLoan"
                type="checkbox"
                checked={
                  postgraduateLoan
                }
                onChange={(e) =>
                  setPostgraduateLoan(
                    e.target.checked
                  )
                }
              />

              <span>
                Include Postgraduate Loan
              </span>
            </label>

            <p
              className={
                styles.HelpText
              }
            >
              Select this if you have a
              postgraduate loan in addition
              to your undergraduate loan.
            </p>
          </div>
        </div>

        {/* --------------------------------
          Taxable Additions
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="preTaxValue">
            Taxable Additions
          </label>

          <div className={styles.InputRow}>
            <div
              className={
                styles.InputWithPrefix
              }
            >
              <span>£</span>

              <input
                id="preTaxValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 200"
                value={preTaxValue}
                onChange={(e) =>
                  setPreTaxValue(
                    e.target.value
                  )
                }
              />
            </div>

            <select
              value={preTaxFrequency}
              onChange={(e) =>
                setPreTaxFrequency(
                  e.target.value as Frequency
                )
              }
                aria-label="Taxable additions frequency"
            >
              <option value="monthly">
                Monthly
              </option>

              <option value="yearly">
                Yearly
              </option>
            </select>
          </div>

          <p className={styles.HelpText}>
            Additional taxable income or benefits
            added before deductions. This does not
            change the pension contribution amounts.
          </p>
        </div>

        {/* --------------------------------
            Salary Sacrifice
        -------------------------------- */}

        <div className={styles.FormGroup}>
          <label htmlFor="salarySacrificeValue">
            Salary Sacrifice
          </label>

          <div className={styles.InputRow}>
            <div
              className={
                styles.InputWithPrefix
              }
            >
              <span>
                {salarySacrificeType ===
                'percentage'
                  ? '%'
                  : '£'}
              </span>

              <input
                id="salarySacrificeValue"
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  salarySacrificeType ===
                  'percentage'
                    ? 'e.g. 5'
                    : 'e.g. 200'
                }
                value={
                  salarySacrificeValue
                }
                onChange={(e) =>
                  setSalarySacrificeValue(
                    e.target.value
                  )
                }
              />
            </div>

            <div className={styles.Toggle}>
              <button
                type="button"
                className={
                  salarySacrificeType ===
                  'amount'
                    ? styles.Active
                    : ''
                }
                onClick={() =>
                  setSalarySacrificeType(
                    'amount'
                  )
                }
              >
                £
              </button>

              <button
                type="button"
                className={
                  salarySacrificeType ===
                  'percentage'
                    ? styles.Active
                    : ''
                }
                onClick={() =>
                  setSalarySacrificeType(
                    'percentage'
                  )
                }
              >
                %
              </button>
            </div>

            {salarySacrificeType === 'amount' && (
              <select
                value={
                  salarySacrificeFrequency
                }
                onChange={(e) =>
                  setSalarySacrificeFrequency(
                    e.target.value as Frequency
                  )
                }
                aria-label="Salary sacrifice frequency"
              >
                <option value="monthly">
                  Monthly
                </option>

                <option value="yearly">
                  Yearly
                </option>
              </select>
            )}
          </div>

          <p className={styles.HelpText}>
            Salary sacrifice reduces your
            taxable salary and, for the current
            tax year, can reduce the earnings
            subject to employee National
            Insurance.
          </p>
        </div>

        {/* --------------------------------
            Error
        -------------------------------- */}

        {error && (
          <div className={styles.ErrorMessage}>
            {error}
          </div>
        )}

        {/* --------------------------------
            Calculate
        -------------------------------- */}

        <button
          type="submit"
          className={
            styles.CalculateButton
          }
        >
          Calculate
        </button>

        {/* --------------------------------
            Results
        -------------------------------- */}

        {calculation && scenarioValues && (
          <div
            className={
              styles.ResultsContainer
            }
          >
            <div
              className={
                styles.ResultsHeader
              }
            >
              <h2>
                Calculation Breakdown
              </h2>

              <p>
                2026/27 annual estimate
              </p>
            </div>

            <div
              className={
                styles.ResultsTableWrapper
              }
            >
              <table
                className={
                  styles.ResultsTable
                }
              >
                <thead>
                  <tr className={styles.TableSectionHeader}>
                    <th colSpan={4}>Pay and deductions</th>
                  </tr>

                  <tr>
                    <th>Breakdown</th>
                    <th>Year</th>
                    <th>Regular month</th>
                    <th>Bonus month</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Basic salary */}

                  <tr className={styles.AdditionRow}>
                    <td>Basic salary</td>

                    <td>
                      {formatCurrency(
                        calculation.basicSalary
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(calculation.basicSalary)
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(calculation.basicSalary)
                      )}
                    </td>
                  </tr>

                  {/* Taxable additions */}

                  {calculation.taxableAdditions > 0 && (
                    <tr className={styles.AdditionRow}>
                      <td>Taxable additions</td>
                      <td>{formatCurrency(calculation.taxableAdditions)}</td>
                      <td>{formatCurrency(monthly(calculation.taxableAdditions))}</td>
                      <td>{formatCurrency(monthly(calculation.taxableAdditions))}</td>
                    </tr>
                  )}

                  {/* Bonus */}

                  {calculation.bonus >
                    0 && (
                    <tr className={styles.AdditionRow}>
                      <td>Bonus</td>

                      <td>
                        {formatCurrency(
                          calculation.bonus
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          0
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          calculation.bonus
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Employee Pension */}

                  <tr className={styles.EmployeePensionRow}>
                    <td>
                      Employee Pension
                    </td>

                    <td>
                      {formatCurrency(
                        calculation.employeePension
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(
                          calculation.employeePension
                        )
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(
                          calculation.employeePension
                        )
                      )}
                    </td>
                  </tr>

                  {/* Salary Sacrifice */}

                  {calculation.salarySacrifice >
                    0 && (
                    <tr className={styles.EmployeePensionRow}>
                      <td>
                        Salary Sacrifice
                      </td>

                      <td>
                        {formatCurrency(
                          calculation.salarySacrifice
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          monthly(
                            calculation.salarySacrifice
                          )
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          monthly(
                            calculation.salarySacrifice
                          )
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Income Tax */}

                  <tr className={`${styles.IncomeTaxRow} ${styles.DeductionRow}`}>
                    <td>
                      Income Tax
                    </td>

                    <td>
                      {formatCurrency(
                        calculation.tax
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(
                          scenarioValues.regularMonth.tax
                        )
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        bonusMonthValue(
                          calculation.tax,
                          scenarioValues.regularMonth.tax
                        )
                      )}
                    </td>
                  </tr>

                  <tr className={styles.TaxBandHeader}>
                    <td colSpan={4}>
                      Income Tax bands <span>tax breakdown</span>
                    </td>
                  </tr>

                  <tr className={styles.TaxBandRow}>
                    <td>
                      <span className={styles.TaxBandRate}>0% Tax</span>
                      <span className={styles.TaxBandAmount}>
                        Tax-free allowance: {formatCurrency(calculation.personalAllowance)}
                      </span>
                    </td>
                    <td>{formatCurrency(0)}</td>
                    <td>{formatCurrency(0)}</td>
                    <td>{formatCurrency(0)}</td>
                  </tr>

                  {calculation.taxBands.map(
                    (band) => {
                      const regularBand =
                        scenarioValues.regularMonth.taxBands.find(
                          (regular) => regular.label === band.label
                        )
                      const regularAmount = regularBand?.amount ?? 0

                      return (
                        <tr
                          key={band.label}
                          className={styles.TaxBandRow}
                        >
                          <td>
                            <span className={styles.TaxBandRate}>
                              {band.rate}% Tax
                            </span>
                            <span className={styles.TaxBandAmount}>
                              Taxable income: {formatCurrency(band.taxableAmount)}
                            </span>
                          </td>
                          <td>{formatCurrency(band.amount)}</td>
                          <td>{formatCurrency(monthly(regularAmount))}</td>
                          <td>
                            {formatCurrency(
                              bonusMonthValue(band.amount, regularAmount)
                            )}
                          </td>
                        </tr>
                      )
                    }
                  )}

                  {/* National Insurance */}

                  <tr className={styles.DeductionRow}>
                    <td>National Insurance</td>
                    <td>{formatCurrency(calculation.nationalInsurance)}</td>
                    <td>
                      {formatCurrency(
                        monthly(
                          scenarioValues.regularMonth.niBands.reduce(
                            (total, band) => total + band.amount,
                            0
                          )
                        )
                      )}
                    </td>
                    <td>
                      {formatCurrency(
                        bonusMonthValue(
                          calculation.nationalInsurance,
                          scenarioValues.regularMonth.niBands.reduce(
                            (total, band) => total + band.amount,
                            0
                          )
                        )
                      )}
                    </td>
                  </tr>

                  <tr className={styles.TaxBandHeader}>
                    <td colSpan={4}>
                      National Insurance bands <span>NI breakdown</span>
                    </td>
                  </tr>

                  {calculation.niBands.map(
                    (band) => {
                      const regularBand =
                        scenarioValues.regularMonth.niBands.find(
                          (regular) => regular.label === band.label
                        )
                      const regularAmount = regularBand?.amount ?? 0
                      const rangeLabel =
                        band.upper === Infinity
                          ? `Above ${formatCurrency(band.lower)}`
                          : band.lower === 0
                            ? `Up to ${formatCurrency(band.upper)}`
                            : `${formatCurrency(band.lower)} - ${formatCurrency(band.upper)}`

                      return (
                        <tr
                          key={band.label}
                          className={styles.TaxBandRow}
                        >
                          <td>
                            <span className={styles.TaxBandRate}>
                              {band.rate}% NI
                            </span>
                            <span className={styles.TaxBandAmount}>
                              {rangeLabel}: {formatCurrency(band.taxableAmount)}
                            </span>
                          </td>
                          <td>{formatCurrency(band.amount)}</td>
                          <td>{formatCurrency(monthly(regularAmount))}</td>
                          <td>
                            {formatCurrency(
                              bonusMonthValue(band.amount, regularAmount)
                            )}
                          </td>
                        </tr>
                      )
                    }
                  )}

                  {/* Student Loan */}

                  {calculation.studentLoan >
                    0 && (
                    <tr className={styles.DeductionRow}>
                      <td>
                        Student Loan
                      </td>

                      <td>
                        {formatCurrency(
                          calculation.studentLoan
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          monthly(
                            scenarioValues.regularMonth.studentLoan
                          )
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          bonusMonthValue(
                            calculation.studentLoan,
                            scenarioValues.regularMonth.studentLoan
                          )
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Postgraduate Loan */}

                  {calculation.postgraduateLoan >
                    0 && (
                    <tr className={styles.DeductionRow}>
                      <td>
                        Postgraduate Loan
                      </td>

                      <td>
                        {formatCurrency(
                          calculation.postgraduateLoan
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          monthly(
                            scenarioValues.regularMonth.postgraduateLoan
                          )
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          bonusMonthValue(
                            calculation.postgraduateLoan,
                            scenarioValues.regularMonth.postgraduateLoan
                          )
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Take Home */}

                  <tr
                    className={
                      styles.TakeHomeRow
                    }
                  >
                    <td>
                      Take Home Pay
                    </td>

                    <td>
                      {formatCurrency(
                        calculation.takeHomePay
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(
                          scenarioValues.regularMonth.takeHomePay
                        )
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        bonusMonthValue(
                          calculation.takeHomePay,
                          scenarioValues.regularMonth.takeHomePay
                        )
                      )}
                    </td>
                  </tr>

                  {/* Total Pension */}

                  <tr className={styles.TotalPensionRow}>
                    <td>Total Pension</td>
                    <td>
                      {formatCurrency(
                        calculation.employeePension +
                          calculation.employerPension
                      )}
                    </td>
                    <td>
                      {formatCurrency(
                        monthly(
                          calculation.employeePension +
                            calculation.employerPension
                        )
                      )}
                    </td>
                    <td>
                      {formatCurrency(
                        monthly(
                          calculation.employeePension +
                            calculation.employerPension
                        )
                      )}
                    </td>
                  </tr>

                  {/* Total Tax */}

                  <tr
                    className={`${styles.TotalTaxRow} ${styles.DeductionRow}`}
                  >
                    <td>
                      Total Government Deductions
                    </td>

                    <td>
                      {formatCurrency(
                        totalGovernmentDeductions
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        monthly(
                          regularGovernmentDeductions
                        )
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        bonusMonthValue(
                          totalGovernmentDeductions,
                          regularGovernmentDeductions
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              className={
                styles.ResultsNote
              }
            >
              Monthly figures are annual amounts
              divided by 12. Actual payroll
              deductions can differ slightly because
              PAYE and National Insurance are
              calculated through payroll using
              pay-period thresholds and rounding.
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default Home
