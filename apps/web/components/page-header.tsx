import * as React from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-4 border-b border-stroke-soft-200 pb-5'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>{title}</h1>
        {description && (
          <p className='mt-1 text-paragraph-sm text-text-sub-600'>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}