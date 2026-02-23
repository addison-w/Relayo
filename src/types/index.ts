export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  toEmail: string;
  useSsl: boolean;
  useStartTls: boolean;
};

export type SimInfo = {
  slotIndex: number;
  subscriptionId: number;
  carrierName: string;
  detectedNumber: string | null;
  manualNumber: string | null;
  iccId: string | null;
  isActive: boolean;
};

export type SendStatus = 'success' | 'failed';

export type LastStatus = {
  lastAttemptAt: string | null;
  lastResult: SendStatus | null;
  lastErrorShort: string | null;
};

export type DiagnosticModule = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'ready' | 'warning' | 'error' | 'unknown';
};

export type PermissionStep = {
  id: string;
  number: string;
  title: string;
  description: string;
  module: string;
  status: 'pending' | 'granted' | 'denied';
  accentColor: 'green' | 'cyan' | 'amber' | 'text';
};


export type RelayLog = {
  id: number;
  senderNumber: string;
  receiverNumber: string;
  messagePreview: string;
  receivedAt: number;
  relayedAt: number;
  status: 'sent' | 'failed';
  errorCode: string | null;
  errorMessage: string | null;
};