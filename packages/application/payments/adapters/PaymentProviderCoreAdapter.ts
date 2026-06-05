/**
 * PaymentProviderCoreAdapter — mapping helpers between embedded provider types
 * and @northflow/payment-orchestration-core provider contract types.
 *
 * Phase 8B: establishes @northflow/payment-orchestration-core as the canonical
 * provider action/capability contract shape. These helpers allow embedded
 * AuraPoS provider outputs to be expressed as core DTOs without changing
 * any runtime behavior.
 *
 * Rules:
 * - No runtime behavior changes to embedded providers.
 * - No embedded provider rewrites.
 * - Mapping is pure: input → output, no side effects.
 * - Existing provider codes (fake_gateway, xendit_sandbox, manual) are unchanged.
 */

import type { ProviderAction, ProviderCapabilities } from '@pos/domain/payments';
import type {
  PaymentProviderAction,
  PaymentProviderCapabilities,
} from '@northflow/payment-orchestration-core';

// ── Action mapping ─────────────────────────────────────────────────────────────

/**
 * toCoreProviderAction — convert a single embedded ProviderAction to the
 * canonical core PaymentProviderAction shape.
 *
 * Field mapping:
 * - `type`       — identical literal values (same union)
 * - `descriptor` — identical literal values (same union)
 * - `label`      — passed through unchanged
 * - `value`      — embedded `value` (optional) coalesced to `null`
 * - `url`        — set to `value` for WEB_URL actions (redirect), null otherwise.
 *                  Rationale: embedded providers store the redirect URL in `value`;
 *                  core separates `url` for redirect actions for clarity.
 *
 * Note: embedded `expiresAt` and `metadata` are not present in the core shape.
 * They are intentionally dropped in this mapping — core is a portable DTO.
 * Callers needing expiry/metadata should retain the original embedded action.
 */
export function toCoreProviderAction(embedded: ProviderAction): PaymentProviderAction {
  return {
    type: embedded.type,
    descriptor: embedded.descriptor,
    label: embedded.label,
    value: embedded.value ?? null,
    url: embedded.descriptor === 'WEB_URL' ? (embedded.value ?? null) : null,
  };
}

/**
 * toCoreProviderActions — convert an array of embedded ProviderActions to core shapes.
 *
 * Returns an empty array when given an empty array (immediate_success / immediate_failure
 * scenarios produce no actions).
 */
export function toCoreProviderActions(embedded: ProviderAction[]): PaymentProviderAction[] {
  return embedded.map(toCoreProviderAction);
}

// ── Capability mapping ─────────────────────────────────────────────────────────

/**
 * toCoreProviderCapabilities — convert embedded ProviderCapabilities to the
 * canonical core PaymentProviderCapabilities shape.
 *
 * Field mapping:
 * - `canCancel`                 → `supportsCancel`  (rename only)
 * - `canRefund`                 → `supportsRefund`  (rename only)
 * - `supportsWebhook`           → `supportsWebhook` (direct)
 * - `supportsPolling`           → `supportsPolling` (direct)
 * - `supportsRedirect`          → `supportsRedirect` (direct)
 * - `supportsQr`                → `supportsQr` (direct)
 * - `supportsVa`                → `supportsVa` (direct)
 * - `supportsPaymentCode`       → `supportsPaymentCode` (direct)
 * - `supportsPartialRefund`     → `supportsPartialRefund` (direct)
 * - `supportsMultiplePartialRefund` → `supportsMultiplePartialRefund` (direct, Phase 8B optional)
 * - `canReturnImmediateSuccess` → `canReturnImmediateSuccess` (direct, Phase 8B optional)
 * - `canReturnImmediateFailure` → `canReturnImmediateFailure` (direct, Phase 8B optional)
 * - `supportedMethods`         → always `[]` (embedded has no equivalent; Phase 9+ may populate)
 * - `supportedScenarios`       — dev/test only, not represented in core contract
 */
export function toCoreProviderCapabilities(
  embedded: ProviderCapabilities,
): PaymentProviderCapabilities {
  return {
    supportsCancel: embedded.canCancel,
    supportsRefund: embedded.canRefund,
    supportsPolling: embedded.supportsPolling,
    supportsWebhook: embedded.supportsWebhook,
    supportedMethods: [],
    supportsRedirect: embedded.supportsRedirect,
    supportsQr: embedded.supportsQr,
    supportsVa: embedded.supportsVa,
    supportsPaymentCode: embedded.supportsPaymentCode,
    supportsPartialRefund: embedded.supportsPartialRefund,
    supportsMultiplePartialRefund: embedded.supportsMultiplePartialRefund,
    canReturnImmediateSuccess: embedded.canReturnImmediateSuccess,
    canReturnImmediateFailure: embedded.canReturnImmediateFailure,
  };
}
