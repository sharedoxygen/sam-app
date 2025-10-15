'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInfoCircle,
  faUndo,
  faFileCsv,
  faCopy,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import styles from './page.module.css';

interface Product {
  name: string;
  avgPremium: number;
  commission: number;
  requiredApps?: number;
}

const DEFAULT_PRODUCTS: Product[] = [
  { name: 'Property & Casualty', avgPremium: 1400, commission: 3 },
  { name: 'Fire', avgPremium: 1000, commission: 3 },
];

function toCSV(salary: number, products: Product[]): string {
  let csv = 'Target Salary,Product,Avg Premium,Commission Rate (%),Required Applications\n';
  products.forEach((p: Product) => {
    const req =
      p.avgPremium > 0 && p.commission > 0 && salary > 0
        ? Math.ceil(salary / (p.avgPremium * (p.commission / 100)))
        : '-';
    csv += `${salary},${p.name},${p.avgPremium},${p.commission},${req}\n`;
  });
  return csv;
}

export default function SalaryCalculator() {
  const { user } = useAuth();
  const router = useRouter();
  const [salary, setSalary] = useState<number>(65000);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);

  // Only allow ADMIN
  if (user?.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  const validate = (field: string, value: string | number): string => {
    if (field === 'name') return (value as string).trim() === '' ? 'Required' : '';
    if (Number(value) < 0) return 'No negatives';
    return '';
  };

  const handleProductChange = (idx: number, field: keyof Product, value: string | number) => {
    setProducts((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, [field]: field === 'name' ? String(value) : Number(value) } : p
      )
    );
    setErrors((prev) => ({ ...prev, [`${idx}-${field}`]: validate(field, value) }));
  };

  const handleAppCountChange = (idx: number, value: string | number) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, requiredApps: Number(value) } : p))
    );
  };

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, { name: '', avgPremium: 0, commission: 0 }]);
  };

  const handleRemoveProduct = (idx: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setSalary(65000);
    setProducts(DEFAULT_PRODUCTS);
    setErrors({});
  };

  const handleExportCSV = () => {
    const csv = toCSV(salary, products);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salary-calculator.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const csv = toCSV(salary, products);
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">Agent Salary Calculator</h1>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="reverseModeSwitch"
          checked={reverseMode}
          onChange={() => setReverseMode((r) => !r)}
        />
        <label className="form-check-label" htmlFor="reverseModeSwitch">
          Reverse Mode: Calculate Salary from Applications
        </label>
      </div>
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label" htmlFor="salary-input">
              Target Salary ($)
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="ms-2 text-muted"
                title="Annual salary goal for the agent."
              />
            </label>
            <input
              id="salary-input"
              type="number"
              className={`form-control ${styles.inputField}`}
              value={
                reverseMode
                  ? products.reduce(
                      (sum, p) =>
                        sum +
                        (p.requiredApps && p.avgPremium && p.commission
                          ? p.requiredApps * p.avgPremium * (p.commission / 100)
                          : 0),
                      0
                    )
                  : salary
              }
              min={0}
              step="any"
              onChange={(e) => setSalary(Number(e.target.value))}
              aria-label="Target Salary"
              readOnly={reverseMode}
            />
          </div>
          <div className="mb-3 d-flex flex-wrap gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={handleReset}
              title="Reset to defaults"
            >
              <FontAwesomeIcon icon={faUndo} className="me-1" /> Reset
            </button>
            <button
              className="btn btn-outline-success"
              onClick={handleExportCSV}
              title="Export to CSV"
            >
              <FontAwesomeIcon icon={faFileCsv} className="me-1" /> Export CSV
            </button>
            <button
              className="btn btn-outline-info"
              onClick={handleCopy}
              title="Copy results to clipboard"
            >
              <FontAwesomeIcon icon={faCopy} className="me-1" />{' '}
              {copied ? 'Copied!' : 'Copy Results'}
            </button>
          </div>
          <div className="table-responsive">
            <table className={`table align-middle table-bordered ${styles.salaryTable}`}>
              <thead className="table-light">
                <tr>
                  <th>
                    Product
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="ms-1 text-muted"
                      title="Type of insurance product."
                    />
                  </th>
                  <th>
                    Avg Premium ($)
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="ms-1 text-muted"
                      title="Average annual premium for this product."
                    />
                  </th>
                  <th>
                    Commission Rate (%)
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="ms-1 text-muted"
                      title="Percent of premium paid to agent as commission."
                    />
                  </th>
                  <th>
                    {reverseMode ? 'Required Applications (editable)' : 'Required Applications'}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="ms-1 text-muted"
                      title={
                        reverseMode
                          ? 'Enter number of applications to calculate salary.'
                          : 'Number of applications needed to reach salary.'
                      }
                    />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={idx} className={styles.fadeInRow}>
                    <td>
                      <input
                        type="text"
                        className={`form-control${errors[`${idx}-name`] ? ' is-invalid' : ''} ${styles.wideInputField}`}
                        value={p.name}
                        onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                        placeholder="Product Name"
                        aria-label="Product Name"
                      />
                      {errors[`${idx}-name`] && (
                        <div className="invalid-feedback">{errors[`${idx}-name`]}</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`form-control${errors[`${idx}-avgPremium`] ? ' is-invalid' : ''} ${styles.inputField}`}
                        value={p.avgPremium}
                        min={0}
                        step="any"
                        onChange={(e) => handleProductChange(idx, 'avgPremium', e.target.value)}
                        aria-label="Average Premium"
                      />
                      {errors[`${idx}-avgPremium`] && (
                        <div className="invalid-feedback">{errors[`${idx}-avgPremium`]}</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`form-control${errors[`${idx}-commission`] ? ' is-invalid' : ''} ${styles.inputField}`}
                        value={p.commission}
                        min={0}
                        max={100}
                        step="any"
                        onChange={(e) => handleProductChange(idx, 'commission', e.target.value)}
                        aria-label="Commission Rate"
                      />
                      {errors[`${idx}-commission`] && (
                        <div className="invalid-feedback">{errors[`${idx}-commission`]}</div>
                      )}
                    </td>
                    <td className={styles.calcResult}>
                      {reverseMode ? (
                        <input
                          type="number"
                          className={`form-control ${styles.reverseModeInput}`}
                          value={p.requiredApps ?? ''}
                          min={0}
                          step="any"
                          onChange={(e) => handleAppCountChange(idx, e.target.value)}
                          aria-label="Required Applications"
                        />
                      ) : (
                        <>
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="me-1 text-muted"
                            title="Calculated automatically"
                          />
                          {p.avgPremium > 0 && p.commission > 0 && salary > 0
                            ? Math.ceil(salary / (p.avgPremium * (p.commission / 100)))
                            : '-'}
                        </>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveProduct(idx)}
                        disabled={products.length <= 1}
                        title="Remove product"
                        aria-label="Remove product"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn btn-outline-primary mt-2"
            onClick={handleAddProduct}
            aria-label="Add Product"
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Product
          </button>
        </div>
      </div>
    </div>
  );
}
