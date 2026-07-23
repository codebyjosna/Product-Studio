import React from 'react';

export type SkeletonVariant = 'studio' | 'auth' | 'upgrade' | 'checkout' | 'pricing';

export function getSkeletonVariant(pathname: string): SkeletonVariant {
  if (pathname === '/' || /^\/[0-9a-f-]{36}$/i.test(pathname)) return 'studio';
  if (pathname.startsWith('/upgrade')) return 'upgrade';
  if (
    pathname.startsWith('/order-summary') ||
    pathname.startsWith('/final-summary') ||
    pathname.startsWith('/transaction-summary')
  ) {
    return 'checkout';
  }
  return 'auth';
}

function Bone({ className = '' }: { className?: string }) {
  return <div className={`skeleton-bone ${className}`} />;
}

function HeaderBone() {
  return (
    <div className="shrink-0 h-14 md:h-16 border-b border-line/80 bg-panel/70 px-6 md:px-10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bone className="h-5 w-36" />
        <Bone className="h-6 w-14 rounded-md" />
      </div>
      <Bone className="h-9 w-24 rounded-md" />
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="app-shell md:h-screen w-full flex flex-col md:overflow-hidden">
      <HeaderBone />
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden min-h-0">
        <div className="w-full md:w-[480px] md:shrink-0 p-6 md:p-10 border-b md:border-b-0 md:border-r border-line/80 bg-panel/55 space-y-6">
          <Bone className="h-4 w-32" />
          <Bone className="h-24 w-full rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Bone className="h-7 w-20 rounded-md" />
            <Bone className="h-7 w-24 rounded-md" />
            <Bone className="h-7 w-28 rounded-md" />
          </div>
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-4 w-28 mt-4" />
          <Bone className="h-24 w-full rounded-lg" />
          <Bone className="h-12 w-full rounded-lg" />
        </div>
        <div className="flex-1 p-6 md:p-10 space-y-4">
          <Bone className="aspect-video w-full rounded-xl" />
          <div className="flex gap-3">
            <Bone className="h-16 w-24 rounded-md" />
            <Bone className="h-16 w-24 rounded-md" />
            <Bone className="h-16 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="app-shell min-h-screen w-full flex flex-col">
      <HeaderBone />
      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md rounded-xl border border-line/90 bg-panel/70 p-6 md:p-8 space-y-4">
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-64" />
          <Bone className="h-11 w-full rounded-lg mt-4" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg mt-2" />
          <Bone className="h-4 w-48 mx-auto mt-4" />
        </div>
      </main>
    </div>
  );
}

function UpgradeSkeleton() {
  return (
    <div className="app-shell min-h-screen w-full flex flex-col">
      <HeaderBone />
      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="flex flex-col items-center gap-4">
            <Bone className="h-10 w-80 md:w-[28rem] max-w-full" />
            <Bone className="h-10 w-52 rounded-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`rounded-[1.75rem] border border-line/90 bg-panel/75 p-6 pt-10 space-y-4 ${
                  i === 1 ? 'lg:-mt-2' : ''
                }`}
              >
                <Bone className="h-6 w-20 rounded-full" />
                <Bone className="h-12 w-28" />
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-5/6" />
                <Bone className="h-4 w-4/5" />
                <Bone className="h-12 w-full rounded-xl mt-4" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="app-shell min-h-screen w-full flex flex-col">
      <HeaderBone />
      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-lg rounded-2xl border border-line/90 bg-panel/75 p-6 md:p-8 space-y-4">
          <Bone className="h-3 w-28" />
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-56" />
          <div className="rounded-xl border border-line bg-ink/40 p-4 space-y-3 mt-2">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="h-8 w-32 ml-auto mt-2" />
          </div>
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
          <div className="flex gap-3 pt-2">
            <Bone className="h-11 flex-1 rounded-lg" />
            <Bone className="h-11 flex-1 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}

export function PageSkeleton({ variant }: { variant: SkeletonVariant }) {
  switch (variant) {
    case 'studio':
      return <StudioSkeleton />;
    case 'upgrade':
      return <UpgradeSkeleton />;
    case 'checkout':
      return <CheckoutSkeleton />;
    case 'auth':
    default:
      return <AuthSkeleton />;
  }
}
