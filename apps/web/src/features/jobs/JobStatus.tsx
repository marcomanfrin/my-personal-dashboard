import type { JobStatus } from '@argus/shared';
import { Icon } from '../../components/ui/Icon';
import { Pill, Tag } from '../../components/ui/primitives';
import { useJobs } from '../../hooks/useJobs';
import { cn } from '../../lib/cn';
import { JOB_STATUS_CLASS, JOB_STATUS_LABEL } from '../../lib/labels';

export function JobStatusPill({ status }: { status: JobStatus }) {
  return (
    <Pill className={JOB_STATUS_CLASS[status]}>
      <Icon name="bot" size="xs" />
      {JOB_STATUS_LABEL[status]}
    </Pill>
  );
}

/** Meta tag on a row or card while an agent is on the record; nothing otherwise. */
export function JobBadge({ recordId, className }: { recordId: string; className?: string }) {
  const job = useJobs().activeFor(recordId);
  if (!job) return null;
  return (
    <Tag icon="bot" className={cn(JOB_STATUS_CLASS[job.status], 'text-c', className)}>
      {JOB_STATUS_LABEL[job.status]}
    </Tag>
  );
}
