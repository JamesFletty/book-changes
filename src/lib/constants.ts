export const DOMAINS = [
  {
    key: 'legal_authority',
    label: 'Legal Authority',
    description: 'Powers of attorney, trustees, and decision-making authority',
    icon: 'Scale',
    color: 'purple',
  },
  {
    key: 'advance_directives',
    label: 'Advance Directives',
    description: 'End-of-life wishes, living wills, and healthcare directives',
    icon: 'FileHeart',
    color: 'pink',
  },
  {
    key: 'financial_accounts',
    label: 'Financial Accounts',
    description: 'Bank accounts, investments, and asset overview',
    icon: 'DollarSign',
    color: 'green',
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    description: 'Medical management, care team, and health records',
    icon: 'Heart',
    color: 'red',
  },
  {
    key: 'housing_care',
    label: 'Housing & Care',
    description: 'Living situation, care setting, and home safety',
    icon: 'Home',
    color: 'blue',
  },
  {
    key: 'changes_capacity',
    label: 'Changes & Capacity',
    description: 'Cognitive and functional changes over time',
    icon: 'Brain',
    color: 'orange',
  },
  {
    key: 'family_coordination',
    label: 'Family Coordination',
    description: 'Roles, decisions, meetings, and communication',
    icon: 'Users',
    color: 'teal',
  },
  {
    key: 'benefits_funding',
    label: 'Benefits & Funding',
    description: 'Insurance, benefits, and funding sources',
    icon: 'CreditCard',
    color: 'indigo',
  },
]

export const DOMAIN_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  needs_review: { label: 'Needs Review', color: 'bg-amber-100 text-amber-700' },
  current: { label: 'Current', color: 'bg-green-100 text-green-700' },
}

export const SITUATION_TYPES = [
  { key: 'organizing', label: 'Just Organizing', description: 'Getting documents and information in order' },
  { key: 'seeing_changes', label: 'Seeing Changes', description: 'Noticing cognitive or physical changes' },
  { key: 'managing_care', label: 'Managing Active Care', description: 'Actively coordinating care and appointments' },
  { key: 'crisis', label: 'In or Near Crisis', description: 'Dealing with an acute situation or hospitalization' },
]

export const DOCUMENT_TYPES = [
  { key: 'poa_financial', label: 'Power of Attorney (Financial)', domainKey: 'legal_authority', isCritical: true },
  { key: 'poa_healthcare', label: 'Power of Attorney (Healthcare)', domainKey: 'legal_authority', isCritical: true },
  { key: 'living_will', label: 'Living Will / Advance Directive', domainKey: 'advance_directives', isCritical: true },
  { key: 'dnr', label: 'DNR / POLST Form', domainKey: 'advance_directives', isCritical: true },
  { key: 'trust_document', label: 'Trust Document', domainKey: 'legal_authority', isCritical: true },
  { key: 'will', label: 'Last Will & Testament', domainKey: 'legal_authority', isCritical: true },
  { key: 'insurance_card', label: 'Insurance Card', domainKey: 'benefits_funding', isCritical: true },
  { key: 'medicare_card', label: 'Medicare Card', domainKey: 'benefits_funding', isCritical: true },
  { key: 'medication_list', label: 'Current Medication List', domainKey: 'healthcare', isCritical: true },
  { key: 'care_plan', label: 'Care Plan', domainKey: 'healthcare', isCritical: false },
  { key: 'medical_records', label: 'Medical Records', domainKey: 'healthcare', isCritical: false },
  { key: 'birth_certificate', label: 'Birth Certificate', domainKey: 'legal_authority', isCritical: false },
  { key: 'social_security_card', label: 'Social Security Card', domainKey: 'legal_authority', isCritical: false },
  { key: 'passport', label: 'Passport', domainKey: 'legal_authority', isCritical: false },
  { key: 'property_deed', label: 'Property Deed', domainKey: 'financial_accounts', isCritical: false },
  { key: 'other', label: 'Other Document', domainKey: null, isCritical: false },
]

export const TRIGGER_EVENT_TYPES = [
  { key: 'HOSPITALIZATION', label: 'Hospitalization' },
  { key: 'SIGNIFICANT_FALL', label: 'Significant Fall' },
  { key: 'NEW_DIAGNOSIS', label: 'New Diagnosis' },
  { key: 'COGNITIVE_EPISODE', label: 'Cognitive Episode' },
  { key: 'CARE_ESCALATION', label: 'Care Escalation' },
  { key: 'MOVE_CARE_SETTING', label: 'Move/Care Setting Change' },
  { key: 'DEATH_OF_SPOUSE', label: 'Death of Spouse' },
  { key: 'LOSS_OF_DRIVING', label: 'Loss of Driving Ability' },
]
