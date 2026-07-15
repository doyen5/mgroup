import { RoleName } from '@prisma/client';

export const DEFAULT_ROLES: Array<{ name: RoleName; label: string; description: string }> = [
  {
    name: RoleName.ADMIN,
    label: 'Admin',
    description: 'Acces complet a la plateforme et validation des utilisateurs.',
  },
  {
    name: RoleName.SECRETAIRE,
    label: 'Secretaire',
    description: 'Gestion administrative, agenda, documents et suivi operationnel.',
  },
  {
    name: RoleName.COMPTABLE,
    label: 'Comptable',
    description: 'Gestion des budgets, factures, paiements et depenses.',
  },
  {
    name: RoleName.RH,
    label: 'RH',
    description: 'Gestion du personnel, contrats, presences et dossiers RH.',
  },
  {
    name: RoleName.COMMERCIAL,
    label: 'Commercial',
    description: 'Suivi commercial, clients, offres, partenaires et opportunites.',
  },
];
