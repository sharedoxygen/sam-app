'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuoteLeft,
  faPlus,
  faSearch,
  faDownload,
  faDollarSign,
  faCalendarAlt,
  faEdit,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import BackButton from '@/components/common/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { QuotesApi } from '@/lib/api';
import styles from './page.module.css';

// Type definitions for quotes
type InsuranceType = 'AUTO' | 'LIFE_HEALTH' | 'PROPERTY_FIRE';

type Quote = {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  insuranceType: InsuranceType;
  premium: number;
  description: string;
  quoteDate: string;
  validUntil: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

// Insurance type options
const INSURANCE_TYPES = [
  { value: 'AUTO', label: 'Automotive Insurance', color: '#e74c3c' },
  { value: 'LIFE_HEALTH', label: 'Life & Health Insurance', color: '#3498db' },
  { value: 'PROPERTY_FIRE', label: 'Property & Fire Insurance', color: '#e67e22' },
];

const QUOTE_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: '#f39c12' },
  { value: 'ACCEPTED', label: 'Accepted', color: '#27ae60' },
  { value: 'REJECTED', label: 'Rejected', color: '#e74c3c' },
  { value: 'EXPIRED', label: 'Expired', color: '#95a5a6' },
];

export default function QuoteLog() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [filter, setFilter] = useState({
    insuranceType: '',
    status: '',
    dateRange: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for adding/editing quotes
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    insuranceType: 'AUTO' as InsuranceType,
    premium: '',
    description: '',
    validUntil: '',
    notes: '',
  });

  // Load quotes on component mount
  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/quotes');
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      } else {
        console.error('Failed to load quotes');
        // For demo purposes, show sample data
        setQuotes([
          {
            id: '1',
            clientName: 'John Smith',
            clientEmail: 'john@example.com',
            clientPhone: '555-123-4567',
            insuranceType: 'AUTO',
            premium: 1200.0,
            description: '2022 Toyota Camry - Full Coverage',
            quoteDate: '2025-07-20',
            validUntil: '2025-08-20',
            status: 'PENDING',
            notes: 'Customer interested in comprehensive coverage',
            createdAt: '2025-07-20T10:00:00Z',
            updatedAt: '2025-07-20T10:00:00Z',
            createdBy: user?.name || 'Current User',
          },
          {
            id: '2',
            clientName: 'Sarah Johnson',
            clientEmail: 'sarah@example.com',
            insuranceType: 'LIFE_HEALTH',
            premium: 850.0,
            description: 'Term Life Insurance - $500K Coverage',
            quoteDate: '2025-07-19',
            validUntil: '2025-08-19',
            status: 'ACCEPTED',
            createdAt: '2025-07-19T14:30:00Z',
            updatedAt: '2025-07-21T09:15:00Z',
            createdBy: user?.name || 'Current User',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddQuote = async () => {
    // Validate form data
    if (!formData.clientName.trim()) {
      setSubmitError('Client name is required');
      return;
    }
    if (!formData.premium || parseFloat(formData.premium) <= 0) {
      setSubmitError('Valid premium amount is required');
      return;
    }
    if (!formData.description.trim()) {
      setSubmitError('Description is required');
      return;
    }
    if (!formData.validUntil) {
      setSubmitError('Valid until date is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const quoteData = {
        ...formData,
        premium: parseFloat(formData.premium),
        quoteDate: new Date().toISOString().split('T')[0],
        status: 'PENDING' as const,
      };

      // Use centralized API service following SAM standards
      const newQuote = await QuotesApi.createQuote(quoteData);

      console.log('✅ Quote created successfully:', {
        id: newQuote.id,
        client: newQuote.clientName,
        premium: newQuote.premium,
        type: newQuote.insuranceType
      });

      // Add to local state only after successful API response
      setQuotes([newQuote, ...quotes]);

      // Reset form and close modal
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        insuranceType: 'AUTO',
        premium: '',
        description: '',
        validUntil: '',
        notes: '',
      });
      setShowAddModal(false);
      setSubmitError(null);
    } catch (error: any) {
      console.error('Error adding quote:', error);

      // Handle specific API errors
      if (error.status === 401) {
        setSubmitError('🔐 Session expired. Please refresh the page and log in again.');
      } else if (error.status === 403) {
        setSubmitError('🚫 You do not have permission to create quotes.');
      } else if (error.status === 400) {
        setSubmitError(`❌ ${error.message || 'Invalid quote data provided.'}`);
      } else if (
        error.message?.includes('Failed to connect') ||
        error.message?.includes('NetworkError')
      ) {
        setSubmitError('🌐 Network error. Please check your connection and try again.');
      } else {
        setSubmitError(`💾 Failed to create quote: ${error.message || 'Unknown error occurred.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and search quotes
  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !filter.insuranceType || quote.insuranceType === filter.insuranceType;
    const matchesStatus = !filter.status || quote.status === filter.status;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Get insurance type info
  const getInsuranceTypeInfo = (type: InsuranceType) => {
    return INSURANCE_TYPES.find((t) => t.value === type) || INSURANCE_TYPES[0];
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status) || QUOTE_STATUSES[0];
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className={styles.quoteLogContainer}>
      <BackButton />

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <FontAwesomeIcon icon={faQuoteLeft} className={styles.headerIcon} />
            <div>
              <h1 className={styles.pageTitle}>Quote Log</h1>
              <p className={styles.pageSubtitle}>Manage and track insurance quotes</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button onClick={() => setShowAddModal(true)} className={styles.addButton}>
              <FontAwesomeIcon icon={faPlus} />
              Add Quote
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search quotes by client name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <select
            value={filter.insuranceType}
            onChange={(e) => setFilter({ ...filter, insuranceType: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="">All Insurance Types</option>
            {INSURANCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            {QUOTE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faQuoteLeft} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{quotes.length}</div>
            <div className={styles.statLabel}>Total Quotes</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              {formatCurrency(quotes.reduce((sum, quote) => sum + quote.premium, 0))}
            </div>
            <div className={styles.statLabel}>Total Value</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              {quotes.filter((q) => q.status === 'PENDING').length}
            </div>
            <div className={styles.statLabel}>Pending</div>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className={styles.quotesTable}>
        <div className={styles.tableHeader}>
          <h2>Recent Quotes</h2>
          <div className={styles.tableActions}>
            <button className={styles.exportButton}>
              <FontAwesomeIcon icon={faDownload} />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading quotes...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faQuoteLeft} className={styles.emptyIcon} />
            <h3>No quotes found</h3>
            <p>Start by adding your first quote to track your insurance business.</p>
            <button onClick={() => setShowAddModal(true)} className={styles.addButton}>
              <FontAwesomeIcon icon={faPlus} />
              Add Your First Quote
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Premium</th>
                  <th>Status</th>
                  <th>Quote Date</th>
                  <th>Valid Until</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => {
                  const typeInfo = getInsuranceTypeInfo(quote.insuranceType);
                  const statusInfo = getStatusInfo(quote.status);

                  return (
                    <tr key={quote.id} className={styles.tableRow}>
                      <td className={styles.clientCell}>
                        <div className={styles.clientInfo}>
                          <div className={styles.clientName}>{quote.clientName}</div>
                          {quote.clientEmail && (
                            <div className={styles.clientEmail}>{quote.clientEmail}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.typeTag} ${styles[`typeTag${quote.insuranceType}`]}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className={styles.premiumCell}>{formatCurrency(quote.premium)}</td>
                      <td>
                        <span className={`${styles.statusTag} ${styles[`status${quote.status}`]}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>{quote.quoteDate}</td>
                      <td>{quote.validUntil}</td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.actionButton}
                          onClick={() => setSelectedQuote(quote)}
                          title="Edit Quote"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Quote Modal */}
      {showAddModal && (
        <div className={styles.modal} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add New Quote</h3>
              <button className={styles.closeButton} onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Error Message Display */}
              {submitError && <div className={styles.errorMessage}>{submitError}</div>}

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Client Name *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Client Email</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Client Phone</label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Insurance Type *</label>
                  <select
                    value={formData.insuranceType}
                    onChange={(e) =>
                      setFormData({ ...formData, insuranceType: e.target.value as InsuranceType })
                    }
                    required
                  >
                    {INSURANCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Premium Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.premium}
                    onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Valid Until *</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the insurance quote"
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this quote..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleAddQuote}
                disabled={
                  isSubmitting ||
                  !formData.clientName ||
                  !formData.premium ||
                  !formData.description ||
                  !formData.validUntil
                }
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className={styles.spinningIcon} />
                    Creating Quote...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPlus} />
                    Add Quote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
