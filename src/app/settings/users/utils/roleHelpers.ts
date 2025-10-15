import { Role } from '@prisma/client';
import { faUserTie, faBriefcase, faUsers, faUser } from '@fortawesome/free-solid-svg-icons';

export const getRoleDisplayName = (role: string) => {
  switch (role) {
    case Role.ADMIN:
      return 'Administrator';
    case 'OFFICE_MANAGER':
      return 'Manager';
    case Role.SALES_LEAD:
      return 'Sales Lead';
    case Role.SERVICE_LEAD:
      return 'Service Lead';
    case Role.SALES:
      return 'Sales Agent';
    case Role.SERVICE:
      return 'Service Agent';
    default:
      return role;
  }
};

export const getRoleColorClass = (role: string) => {
  switch (role) {
    case Role.ADMIN:
      return 'Admin';
    case 'OFFICE_MANAGER':
      return 'OfficeManager';
    case Role.SALES_LEAD:
    case Role.SERVICE_LEAD:
      return 'Lead';
    default:
      return 'Agent';
  }
};

export const getRoleIcon = (role: string) => {
  switch (role) {
    case Role.ADMIN:
      return faUserTie;
    case 'OFFICE_MANAGER':
      return faBriefcase;
    case Role.SALES_LEAD:
    case Role.SERVICE_LEAD:
      return faUsers;
    default:
      return faUser;
  }
};

export const getRoleSortOrder = (role: string) => {
  switch (role) {
    case Role.ADMIN:
      return 0;
    case 'OFFICE_MANAGER':
      return 1;
    case Role.SALES_LEAD:
      return 2;
    case Role.SERVICE_LEAD:
      return 3;
    case Role.SALES:
      return 4;
    case Role.SERVICE:
      return 5;
    default:
      return 6;
  }
};

export type Agent = {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  managerId?: number;
  manager?: {
    id: number;
    name: string;
    role: string;
  };
};
