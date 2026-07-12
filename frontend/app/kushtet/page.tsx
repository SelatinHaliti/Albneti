import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Kushtet e Përdorimit – AlbNet',
  description: 'Rregullat për përdorimin e platformës AlbNet.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Kushtet e Përdorimit" updated="12 Korrik 2026">
      <section>
        <h2 className="text-[18px] font-semibold mb-2">1. Pranimi</h2>
        <p>
          Duke u regjistruar ose përdorur AlbNet, pranoni këto kushte dhe Politikën e Privatësisë. Nëse nuk pajtoheni, mos përdorni platformën.
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">2. Përdorimi i lejuar</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Duhet të jeni të paktën 13 vjeç</li>
          <li>Nuk lejohet spam, ngacmim, urrejtje, përmbajtje e paligjshme ose e dëmshme</li>
          <li>Nuk lejohet imitimi i personave tjerë ose shpërndarja e përmbajtjes së mbrojtur pa leje</li>
          <li>Jeni përgjegjës për përmbajtjen që publikoni</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">3. Llogaria</h2>
        <p>Jeni përgjegjës për sigurinë e llogarisë suaj. AlbNet mund të pezullojë ose fshijë llogarinë në rast shkeljeje të kushteve ose raportimesh të vlefshme.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">4. Verifikimi (badge blu)</h2>
        <p>
          Abonimi i verifikimit ofron badge dhe përfitime në platformë. Pagesat përpunohen përmes Stripe. Për Kosovën përdoret modalitet test derisa Stripe të mbështesë regjionin zyrtarisht për pagesa live.
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">5. Pronësia intelektuale</h2>
        <p>Ju mbani të drejtat mbi përmbajtjen tuaj, por na jepni licencë të kufizuar për ta shfaqur në AlbNet. Marka AlbNet dhe logoja janë pronë e platformës.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">6. Kufizimi i përgjegjësisë</h2>
        <p>AlbNet ofrohet &quot;siç është&quot;. Nuk garantojmë disponueshmëri të pandërprerë. Nuk jemi përgjegjës për dëme indirekte nga përdorimi i shërbimit.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">7. Ndryshime</h2>
        <p>Mund t&apos;i përditësojmë kushtet. Vazhdimi i përdorimit pas ndryshimeve nënkupton pranimin e tyre.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">8. Ligji i zbatueshëm</h2>
        <p>Këto kushte rregullohen në përputhje me ligjet e Republikës së Kosovës, pa përjashtuar mbrojtjen e konsumatorit në BE/UK kur zbatohet GDPR.</p>
      </section>
    </LegalPage>
  );
}
