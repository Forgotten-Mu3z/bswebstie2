import { Gauge } from 'lucide-react';
import type { estimateFps } from '@/lib/fps';

type Estimate = NonNullable<ReturnType<typeof estimateFps>>;

/** Estimated FPS ranges, always labelled as estimates. */
export function FpsTable({
  estimate,
  heading = 'h3',
}: {
  estimate: Estimate;
  heading?: 'h2' | 'h3';
}) {
  const Heading = heading;
  return (
    <div>
      <Heading className="flex items-center gap-2 text-sm font-semibold">
        <Gauge aria-hidden="true" className="size-4 text-accent" />
        Estimated FPS
      </Heading>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
          <tr>
            <th scope="col" className="pb-2 font-normal">
              Game (high settings)
            </th>
            <th scope="col" className="pb-2 pl-3 text-right font-normal">
              1080p
            </th>
            <th scope="col" className="pb-2 pl-3 text-right font-normal">
              1440p
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {estimate.rows.map((row) => (
            <tr key={row.game}>
              <th scope="row" className="py-2 pr-2 font-normal">
                {row.game}
              </th>
              <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular">
                {row.fhd[0]}–{row.fhd[1]}
              </td>
              <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular">
                {row.qhd[0]}–{row.qhd[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-5 text-fg-subtle">
        Rough estimates for the {estimate.gpu}
        {estimate.cpuKnown
          ? ' with this processor'
          : ' with a typical current processor'}
        , from typical results for similar hardware. Real FPS depends on game
        updates, settings, drivers and the rest of the PC. Ask us on WhatsApp
        before you buy.
      </p>
    </div>
  );
}
