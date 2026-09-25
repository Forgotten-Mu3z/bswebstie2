import { Eyebrow } from '@/components/ui/bits';
import { PcBuilder } from '@/components/builder/pc-builder';
import { getBuilderParts } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

export const metadata = {
  title: 'PC builder',
  description:
    'Pick a processor, motherboard, memory, graphics card, storage, cooler, power supply and case. The builder hides parts that do not fit.',
  alternates: { canonical: '/build' },
};

export default async function BuildPage() {
  const [parts, siteUrl] = await Promise.all([getBuilderParts(), getSiteUrl()]);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <Eyebrow>Tools · PC builder</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Build a PC
        </h1>
        <p className="mt-4 leading-7 text-fg-muted">
          Choose parts in order. Each step only shows parts that match what you
          already picked, and your build is saved in the link so you can share
          it or come back later.
        </p>
      </div>
      <PcBuilder parts={parts} siteUrl={siteUrl} />
    </div>
  );
}
