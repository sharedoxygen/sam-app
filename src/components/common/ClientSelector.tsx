'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSearch, faUser, faBuilding, faPlus } from '@fortawesome/free-solid-svg-icons';
import styles from './ClientSelector.module.css'; // Import CSS Module

interface Client {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

interface ClientSelectorProps {
  value?: string; // Client name for now, will be clientId later
  onChange: (clientName: string, clientId?: number) => void;
  onClientSelect?: (client: Client) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  allowNewClient?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  value = '',
  onChange,
  onClientSelect,
  placeholder = 'Select or type client name...',
  required = false,
  error,
  allowNewClient = true,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch all clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowDropdown(true);

    // Call onChange with just the name for now (backward compatibility)
    onChange(newValue);

    // Clear selected client if user is typing something different
    if (selectedClient && selectedClient.name !== newValue) {
      setSelectedClient(null);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSearchTerm(client.name);
    setSelectedClient(client);
    setShowDropdown(false);

    // Call onChange with the client name (for backward compatibility)
    onChange(client.name, client.id);

    // Call onClientSelect if provided
    if (onClientSelect) {
      onClientSelect(client);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isExistingClient = clients.some(
    (client) => client.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const clientInputClasses = [
    styles.clientInput,
    error ? styles.error : '',
    selectedClient ? styles.selected : '',
  ].join(' ');

  return (
    <div className={styles.clientSelectorContainer}>
      <div className={styles.clientInputWrapper}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          required={required}
          className={clientInputClasses}
        />
        {loading && (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className={`${styles.inputIcon} ${styles.loading}`}
          />
        )}
        {!loading && selectedClient && (
          <FontAwesomeIcon icon={faUser} className={`${styles.inputIcon} ${styles.selected}`} />
        )}
        {!loading && !selectedClient && searchTerm && !isExistingClient && allowNewClient && (
          <FontAwesomeIcon
            icon={faPlus}
            className={`${styles.inputIcon} ${styles.new}`}
            title="New client"
          />
        )}
      </div>

      {error && <div className={styles.fieldError}>{error}</div>}

      {showDropdown && (
        <div className={styles.clientDropdown}>
          {filteredClients.length > 0 ? (
            <>
              <div className={styles.dropdownHeader}>Select existing client:</div>
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={styles.clientOption}
                  onClick={() => handleClientSelect(client)}
                >
                  <div className={styles.clientInfo}>
                    <FontAwesomeIcon
                      icon={client.company ? faBuilding : faUser}
                      className={styles.clientListIcon} // Updated class name
                    />
                    <div>
                      <div className={styles.clientName}>{client.name}</div>
                      {client.company && (
                        <div className={styles.clientCompany}>{client.company}</div>
                      )}
                      {(client.email || client.phone) && (
                        <div className={styles.clientContact}>
                          {client.email && <span>{client.email}</span>}
                          {client.email && client.phone && <span> • </span>}
                          {client.phone && <span>{client.phone}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : searchTerm && allowNewClient ? (
            <div className={`${styles.dropdownMessage} ${styles.newClient}`}>
              <FontAwesomeIcon icon={faPlus} />
              <span>Create new client: "{searchTerm}"</span>
            </div>
          ) : (
            <div className={styles.dropdownMessage}>
              <FontAwesomeIcon icon={faSearch} />
              <span>No clients found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
