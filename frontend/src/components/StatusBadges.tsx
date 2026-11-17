import {
  biopsyResultClass,
  biopsyResultLabel,
  biopsyStatusLabel,
  cn,
  examStatusClass,
  examStatusLabel,
  reportStatusClass,
  reportStatusLabel
} from '../lib/utils';
import type { Biopsy, ExamStatus, ReportStatus } from '../types';

export function ExamStatusBadge({ status, dot = true }: { status: ExamStatus; dot?: boolean }) {
  return (
    <span className={cn('badge', examStatusClass(status))}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {status === 'em_andamento' && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {examStatusLabel(status)}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <span className={cn('badge', reportStatusClass(status))}>{reportStatusLabel(status)}</span>;
}

export function BiopsyBadge({ biopsy }: { biopsy: Biopsy }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn('badge', biopsyResultClass(biopsy.result))}>
        {biopsyResultLabel(biopsy.result)}
      </span>
      <span className="badge bg-panel text-muted">{biopsyStatusLabel(biopsy.status)}</span>
      {biopsy.human_validated ? (
        <span className="badge bg-accent/10 text-accent">Validacao humana</span>
      ) : (
        <span className="badge bg-warning/10 text-warning">Aguardando validacao</span>
      )}
    </div>
  );
}
