export type CascadeRule = {
  domainKey: string
  task: string
  daysToComplete: number
}

export const CASCADE_RULES: Record<string, CascadeRule[]> = {
  HOSPITALIZATION: [
    { domainKey: 'healthcare', task: 'Review care plan and current medications', daysToComplete: 3 },
    { domainKey: 'legal_authority', task: 'Confirm POA agent can act', daysToComplete: 1 },
    { domainKey: 'advance_directives', task: 'Confirm directives are on file and accessible', daysToComplete: 1 },
    { domainKey: 'housing_care', task: 'Assess discharge planning needs', daysToComplete: 7 },
    { domainKey: 'benefits_funding', task: 'Notify insurance and check coverage', daysToComplete: 3 },
  ],
  SIGNIFICANT_FALL: [
    { domainKey: 'healthcare', task: 'Schedule follow-up with physician', daysToComplete: 3 },
    { domainKey: 'housing_care', task: 'Conduct home safety assessment', daysToComplete: 7 },
    { domainKey: 'changes_capacity', task: 'Document functional change and date', daysToComplete: 2 },
    { domainKey: 'benefits_funding', task: 'Check if physical therapy covered', daysToComplete: 5 },
  ],
  NEW_DIAGNOSIS: [
    { domainKey: 'healthcare', task: 'Update care plan with new diagnosis', daysToComplete: 7 },
    { domainKey: 'advance_directives', task: 'Review directives given new diagnosis', daysToComplete: 14 },
    { domainKey: 'legal_authority', task: 'Review POA scope for new care needs', daysToComplete: 14 },
    { domainKey: 'benefits_funding', task: 'Verify insurance coverage for new diagnosis', daysToComplete: 7 },
    { domainKey: 'changes_capacity', task: 'Document baseline function at time of diagnosis', daysToComplete: 7 },
  ],
  COGNITIVE_EPISODE: [
    { domainKey: 'healthcare', task: 'Schedule cognitive assessment with physician', daysToComplete: 7 },
    { domainKey: 'changes_capacity', task: 'Document episode details and date', daysToComplete: 1 },
    { domainKey: 'legal_authority', task: 'Review if legal authority documents need updating', daysToComplete: 14 },
    { domainKey: 'housing_care', task: 'Assess home safety for cognitive changes', daysToComplete: 14 },
    { domainKey: 'family_coordination', task: 'Brief family members on episode and plan', daysToComplete: 3 },
  ],
  CARE_ESCALATION: [
    { domainKey: 'housing_care', task: 'Evaluate care setting and staffing needs', daysToComplete: 7 },
    { domainKey: 'healthcare', task: 'Update care plan for escalated needs', daysToComplete: 5 },
    { domainKey: 'benefits_funding', task: 'Review funding options for increased care', daysToComplete: 7 },
    { domainKey: 'family_coordination', task: 'Hold family meeting to coordinate new responsibilities', daysToComplete: 5 },
  ],
  MOVE_CARE_SETTING: [
    { domainKey: 'housing_care', task: 'Document new care setting and contact information', daysToComplete: 3 },
    { domainKey: 'healthcare', task: 'Transfer medical records to new facility', daysToComplete: 7 },
    { domainKey: 'benefits_funding', task: 'Update insurance and billing addresses', daysToComplete: 7 },
    { domainKey: 'legal_authority', task: 'Confirm authority documents are available at new location', daysToComplete: 3 },
    { domainKey: 'advance_directives', task: 'Provide copy of directives to new facility', daysToComplete: 3 },
  ],
  DEATH_OF_SPOUSE: [
    { domainKey: 'legal_authority', task: 'Review estate and POA documents', daysToComplete: 7 },
    { domainKey: 'financial_accounts', task: 'Identify accounts to transfer or update', daysToComplete: 14 },
    { domainKey: 'benefits_funding', task: 'Notify Social Security and pension providers', daysToComplete: 14 },
    { domainKey: 'healthcare', task: 'Update emergency contacts and insurance', daysToComplete: 7 },
    { domainKey: 'family_coordination', task: 'Coordinate grief support and family responsibilities', daysToComplete: 7 },
  ],
  LOSS_OF_DRIVING: [
    { domainKey: 'housing_care', task: 'Arrange transportation alternatives', daysToComplete: 7 },
    { domainKey: 'healthcare', task: 'Ensure medical appointments can still be reached', daysToComplete: 7 },
    { domainKey: 'changes_capacity', task: 'Document driving cessation date and reason', daysToComplete: 3 },
    { domainKey: 'family_coordination', task: 'Assign family transportation responsibilities', daysToComplete: 7 },
  ],
}
