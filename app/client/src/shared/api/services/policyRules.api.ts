import { axiosInstance } from '../axiosInstance'

export type PolicyRuleType = 'DO' | 'DONT'
export type PolicyRuleSeverity = 'hard' | 'soft'

export type PolicyRule = {
  id: string
  type: PolicyRuleType
  text: string
  severity: PolicyRuleSeverity
  createdAt: string
}

export type CreatePolicyRuleRequest = {
  type: PolicyRuleType
  text: string
  severity: PolicyRuleSeverity
}

export type UpdatePolicyRuleRequest = Partial<CreatePolicyRuleRequest>

export const policyRulesApi = {
  async getPolicyRules(): Promise<PolicyRule[]> {
    const { data } = await axiosInstance.get<PolicyRule[]>('/policy-rules')
    return data
  },
  async createPolicyRule(payload: CreatePolicyRuleRequest): Promise<PolicyRule> {
    const { data } = await axiosInstance.post<PolicyRule>('/policy-rules', payload)
    return data
  },
  async updatePolicyRule(id: string, payload: UpdatePolicyRuleRequest): Promise<PolicyRule> {
    const { data } = await axiosInstance.patch<PolicyRule>(`/policy-rules/${id}`, payload)
    return data
  },
  async deletePolicyRule(id: string): Promise<void> {
    await axiosInstance.delete(`/policy-rules/${id}`)
  },
}
