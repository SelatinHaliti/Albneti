import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Politika e Privatësisë – AlbNet',
  description: 'Si AlbNet mbledh, përdor dhe mbron të dhënat tuaja.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politika e Privatësisë" updated="12 Korrik 2026">
      <section>
        <h2 className="text-[18px] font-semibold mb-2">1. Kush jemi</h2>
        <p>
          AlbNet (&quot;ne&quot;, &quot;platforma&quot;) është një rrjet social shqiptar. Kjo politikë shpjegon si i trajtojmë të dhënat tuaja personale në përputhje me GDPR dhe ligjet e zbatueshme në Kosovë, Shqipëri dhe diasporë.
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">2. Të dhënat që mbledhim</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Emri i përdoruesit, email-i, fjalëkalimi (i enkriptuar), profili (foto, bio, vendndodhja)</li>
          <li>Postime, story, reels, mesazhe dhe përmbajtje që krijoni</li>
          <li>Të dhëna teknike: adresa IP, pajisja, cookies, log-e sigurie</li>
          <li>Abonimi verifikimi (Stripe): status pagese, jo numri i plotë i kartës</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">3. Si i përdorim</h2>
        <p>Ne i përdorim të dhënat për të ofruar shërbimin, personalizuar feed-in, dërguar njoftime, moderuar përmbajtjen, parandaluar abuzimin dhe përmbushur detyrimet ligjore.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">4. Shërbime të palëve të treta</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>MongoDB Atlas</strong> – ruajtja e të dhënave</li>
          <li><strong>Cloudinary</strong> – foto dhe video</li>
          <li><strong>Stripe</strong> – pagesa për verifikim (modalitet test për Kosovën)</li>
          <li><strong>Vercel / Render</strong> – hosting</li>
          <li><strong>Google / Apple</strong> – kyçje opsionale OAuth</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">5. Të drejtat tuaja (GDPR)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Eksport</strong> – shkarkoni të dhënat nga Redakto profilin</li>
          <li><strong>Fshirje</strong> – fshini llogarinë përgjithmonë nga Redakto profilin</li>
          <li><strong>Korrigjim</strong> – përditësoni profilin në çdo kohë</li>
          <li><strong>Ankesë</strong> – kontaktoni mbështetjen në support@albneti.vercel.app</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">6. Ruajtja dhe siguria</h2>
        <p>Të dhënat ruhen derisa të fshini llogarinë. Përdorim enkriptim, JWT, dhe masa të standardizuara sigurie. Asnjë sistem nuk është 100% i sigurt.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">7. Fëmijët</h2>
        <p>AlbNet kërkon moshë minimale 13 vjeç. Nëse mendoni se një fëmijë ka krijuar llogari pa leje prindërore, na kontaktoni.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold mb-2">8. Kontakt</h2>
        <p>Pyetje për privatësinë: <a href="mailto:support@albneti.vercel.app" className="text-[var(--ig-blue)]">support@albneti.vercel.app</a></p>
      </section>
    </LegalPage>
  );
}
