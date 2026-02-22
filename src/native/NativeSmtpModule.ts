import { NativeModules } from 'react-native';

interface SmtpConfigInput {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  toEmail: string;
  useSsl: boolean;
  useStartTls: boolean;
}

interface SmtpConfigOutput {
  host: string;
  port: number;
  username: string;
  hasPassword: boolean;
  fromEmail: string;
  toEmail: string;
  useSsl: boolean;
  useStartTls: boolean;
}

interface SmtpModuleInterface {
  saveConfig(config: SmtpConfigInput): Promise<boolean>;
  loadConfig(): Promise<SmtpConfigOutput | null>;
  sendTestEmail(): Promise<boolean>;
  sendEmail(subject: string, body: string): Promise<boolean>;
}

const { SmtpModule } = NativeModules as { SmtpModule: SmtpModuleInterface };

export default {
  saveConfig: (config: SmtpConfigInput): Promise<boolean> =>
    SmtpModule.saveConfig(config),

  loadConfig: (): Promise<SmtpConfigOutput | null> =>
    SmtpModule.loadConfig(),

  sendTestEmail: (): Promise<boolean> =>
    SmtpModule.sendTestEmail(),

  sendEmail: (subject: string, body: string): Promise<boolean> =>
    SmtpModule.sendEmail(subject, body),
};
