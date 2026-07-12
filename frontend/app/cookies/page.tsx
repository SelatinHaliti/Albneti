import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Politika e Cookies – AlbNet',
  description: 'Si AlbNet përdor cookies dhe ruajtje lokale.',
};

export default function CookiesPage() {
  return (
    <LegalPage title="Politika e Cookies" updated="12 Korrik 2026">
      <section>
        <h2 className="text-[18px] font-semibold mb-2">Çfarë janë cookies?</h2>
        <p>
          Cookies janë skedarë të vegjël teksti që ruhen në pajisjen tuaj. AlbNet përdor edhe localStorage për sesionin dhe preferencat (tema, pëlqimi cookies).
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">Cookies që përdorim</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>token / sesioni</strong> – për t&apos;ju mbajtur të kyçur (e domosdoshme)</li>
          <li><strong>albnet_cookie_consent</strong> – ruan zgjedhjen tuaj për cookies</li>
          <li><strong>theme</strong> – modaliteti i errët/ndriçuar</li>
          <li><strong>Push notifications</strong> – vetëm me lejen tuaj</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">Cookies të palëve të treta</h2>
        <p>Stripe mund të vendosë cookies gjatë pagesës. Google/Apple OAuth mund të përdorin cookies gjatë kyçjes. Ne nuk përdorim reklama me tracking.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">Si t&apos;i menaxhoni</h2>
        <p>Mund t&apos;i fshini cookies nga cilësimet e shfletuesit. Pa cookies thelbësore, disa funksione (kyçja) nuk do të punojnë siç duhet.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">Më shumë informacion</h2>
        <p>Shihni edhe <a href="/privatesi" className="text-[var(--ig-blue)]">Politikën e Privatësisë</a>.</p>
      </section>
    </LegalPage>
  );
}
