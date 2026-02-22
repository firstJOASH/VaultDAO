export interface VaultError {
  code: string;
  message: string;
}

/**
 * Type guard to safely check if an unknown error has
 * specific properties like 'title' or 'message'.
 */
const isObjectWithErrorProps = (error: unknown): error is { title?: string; message?: string } => {
    return typeof error === 'object' && error !== null;
};

export const parseError = (error: unknown): VaultError => {
  if (!error) {
    return { code: "UNKNOWN", message: "An unknown error occurred." };
  }

  // Default message extraction
  const errorTitle = isObjectWithErrorProps(error) ? error.title : "";
  const simulatedLog = isObjectWithErrorProps(error) ? error.message || "" : String(error);

  // Handle Freighter/Wallet errors
  if (errorTitle === "Freighter Error") {
    return { code: "WALLET_ERROR", message: "Transaction rejected by wallet." };
  }

  // Handle Simulation Errors (Sync with Rust Contract Errors)
  if (simulatedLog.includes("Error(Contract, #1)")) {
    return { code: "NOT_INITIALIZED", message: "Contract not initialized." };
  }
  if (simulatedLog.includes("Error(Contract, #2)")) {
    return {
      code: "ALREADY_INITIALIZED",
      message: "Contract already initialized.",
    };
  }
  if (simulatedLog.includes("Error(Contract, #100)")) {
    return {
      code: "UNAUTHORIZED",
      message: "You are not authorized to perform this action.",
    };
  }
  if (simulatedLog.includes("Error(Contract, #101)")) {
    return {
      code: "INSUFFICIENT_FUNDS",
      message: "Insufficient vault balance.",
    };
  }
  if (simulatedLog.includes("Error(Contract, #102)")) {
    return {
      code: "THRESHOLD_NOT_MET",
      message: "Proposal approval threshold not met.",
    };
  }

  // Custom Errors Mapping (from errors.rs)
  if (simulatedLog.includes("Error(Contract, #110)")) {
    return {
      code: "DAILY_LIMIT_EXCEEDED",
      message: "Daily spending limit exceeded.",
    };
  }

  return {
    code: "RPC_ERROR",
    message: isObjectWithErrorProps(error) ? (error.message || "Failed to submit transaction.") : "Failed to submit transaction."
  };
};
