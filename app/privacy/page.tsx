import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/lib/legal";
import { appUrl } from "@/lib/siteUrls";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | Launch & List" },
  description: "How Launch & List collects, uses and protects information about agents and the people who visit their websites.",
  alternates: { canonical: `${appUrl()}/privacy` },
};

const { company: C, product: P, email: E } = LEGAL;
const mail = <a href={`mailto:${E}`}>{E}</a>;

const PROVIDERS: [string, string][] = [
  ["Vercel", "Website hosting, content delivery and custom domain setup"],
  ["Supabase", "Database, sign-in and file storage"],
  ["Anthropic", "AI that writes and edits site content"],
  ["Resend", "Account emails and lead notifications"],
  ["ScrapingBee", "Fetching the web pages you ask us to import"],
  ["Google (Tag Manager and Analytics)", `Measuring how people use ${LEGAL.site} and the dashboard`],
  ["Meta (Instagram)", "Showing your Instagram posts, only if you connect your account"],
  ["Stripe", "Payments, once paid plans are offered"],
];

const CATEGORIES: [string, string][] = [
  ["Identifiers", "Name, email address, phone number, account ID, IP address"],
  ["Customer records", "Brokerage, license number, business address, and billing details once paid plans start"],
  ["Commercial information", "Your plan and billing history"],
  ["Internet or network activity", "Pages viewed, features used, device and browser details"],
  ["Approximate location", "City or region inferred from an IP address"],
  ["Professional information", "Your role, brokerage, license, markets, listings and sales figures you choose to share"],
  ["Audio and visual information", "Headshots, photos and videos you upload"],
];

const sections: LegalSection[] = [
  {
    id: "scope", title: "Who this covers",
    body: <>
      <p>This Privacy Policy explains how {C} (&ldquo;{P},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) handles personal information. It applies to:</p>
      <ul>
        <li><strong>Agents and teams</strong> who sign up for and use {P} (&ldquo;you&rdquo;).</li>
        <li><strong>Visitors to {LEGAL.site}</strong>, including our blog.</li>
        <li><strong>Visitors to websites built with {P}</strong>, as explained in <a href="#visitors">Visitors to agents&apos; websites</a>.</li>
      </ul>
      <p>Using the Service is also covered by our <a href="/terms">Terms of Service</a>.</p>
    </>,
  },
  {
    id: "collect", title: "What we collect",
    body: <>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password. Passwords are stored only in a scrambled (hashed) form we can&apos;t read.</li>
        <li><strong>Profile and business details:</strong> phone number, brokerage, license number, markets you serve, bio, headshot, logo, and stats such as sales volume.</li>
        <li><strong>Site content:</strong> text, photos, videos, listings, reviews, team members and blog posts you add, and the instructions you type into the AI editor.</li>
        <li><strong>Settings:</strong> your custom domain, redirects, and analytics or ad tag IDs you add to your site.</li>
        <li><strong>Messages:</strong> what you send us when you email us or ask for support.</li>
        <li><strong>Payment details,</strong> once paid plans are offered. These are collected directly by our payment processor, Stripe. We receive only limited details, such as the card type, last four digits and expiry date.</li>
      </ul>
      <h3>Information we bring in at your request</h3>
      <ul>
        <li><strong>Imports:</strong> when you give us a web address (your current website, a profile page or a listing page), we fetch those pages and pull out the text, photos and listing details to build your site.</li>
        <li><strong>Connected accounts:</strong> if you connect Instagram, we receive your username, a sign-in token (stored encrypted) and your recent posts, so we can show them on your site.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Usage and device data:</strong> IP address, browser and device type, pages viewed, and the time and date of visits, in our server logs and analytics.</li>
        <li><strong>Cookies:</strong> see <a href="#cookies">Cookies and analytics</a>.</li>
      </ul>
    </>,
  },
  {
    id: "use", title: "How we use it",
    body: <>
      <ul>
        <li>To create, host and publish your website, and to run the editor, imports, lead forms and other features.</li>
        <li>To generate and edit site content with AI when you ask (see <a href="#ai">AI processing</a>).</li>
        <li>To send account emails, such as sign-in links, password resets, lead notifications and important updates about the Service.</li>
        <li>To provide support, respond to requests and handle billing.</li>
        <li>To keep the Service secure, prevent spam and abuse, and enforce our Terms.</li>
        <li>To understand how the Service is used and to improve it.</li>
        <li>To send product news. You can unsubscribe from these at any time, and you&apos;ll still get account and lead emails.</li>
        <li>To comply with the law.</li>
      </ul>
    </>,
  },
  {
    id: "ai", title: "AI processing",
    body: <>
      <p>When you generate a site or ask for an edit, we send the relevant content to our AI provider, Anthropic, to produce the result. This includes your profile details, imported text, the instruction you typed, and the section being changed.</p>
      <p>Under our agreement with Anthropic, it does not use this content to train its models, and it keeps it only for a limited time for safety and abuse monitoring. We keep a history of your edits so you can undo them.</p>
    </>,
  },
  {
    id: "share", title: "How we share it",
    body: <>
      <p><strong>We don&apos;t sell personal information, and we don&apos;t share it for cross-context behavioral advertising.</strong> We share it only in these ways:</p>
      <ul>
        <li><strong>Service providers</strong> who help us run {P}. They process information on our behalf and may use it only for that purpose. These include:
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <tbody>{PROVIDERS.map(([who, what]) => <tr key={who} className="border-t" style={{ borderColor: "#E2D9CB" }}><td className="py-2 pr-4 font-medium">{who}</td><td className="py-2">{what}</td></tr>)}</tbody>
            </table>
          </div>
        </li>
        <li><strong>Publicly, when you publish.</strong> What you put on your website is visible to anyone who visits it.</li>
        <li><strong>With services you connect</strong>, such as your domain registrar, Instagram, or analytics tags you add to your site.</li>
        <li><strong>With the agent</strong>, when a visitor submits a form on that agent&apos;s website.</li>
        <li><strong>For legal reasons</strong>, when we believe it&apos;s required by law or legal process, or needed to protect the rights, safety or property of our users, the public or {P}.</li>
        <li><strong>In a business transfer</strong>, such as a merger, acquisition or sale of assets. The information would stay subject to this policy&apos;s protections.</li>
      </ul>
    </>,
  },
  {
    id: "cookies", title: "Cookies and analytics",
    body: <>
      <p><strong>On {LEGAL.site} and in the dashboard,</strong> we use:</p>
      <ul>
        <li><strong>Essential cookies</strong> that keep you signed in and keep the Service secure. The Service doesn&apos;t work without them.</li>
        <li><strong>Google Analytics, through Google Tag Manager,</strong> to understand which pages and features people use. Google may set its own cookies to do this. You can block them in your browser settings or with Google&apos;s <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">opt-out browser add-on</a>.</li>
      </ul>
      <p>We honor Global Privacy Control signals as a request to opt out of the sale or sharing of personal information, though we don&apos;t do either.</p>
      <p><strong>On agents&apos; websites,</strong> {P} doesn&apos;t add its own analytics or advertising tags. Any tags there were added by the agent and are covered by the agent&apos;s own practices.</p>
    </>,
  },
  {
    id: "visitors", title: "Visitors to agents' websites",
    body: <>
      <p>Websites built with {P} belong to the agents who run them. When you fill in a form on one of those sites, such as a contact form or a home valuation request, we collect what you enter and send it to that agent. This usually includes your name, email, phone number, message, and the page you were on.</p>
      <p>For that information, the agent decides how it&apos;s used, and {P} acts as the agent&apos;s service provider. We store it so the agent can see it in their dashboard, email it to them, and use it to block spam. We use your IP address briefly to limit spam submissions and don&apos;t store it with your submission. We don&apos;t sell form submissions or use them to market to you ourselves.</p>
      <p>The agent may contact you about your request. For questions about how an agent uses your information, or to ask them to delete it, contact the agent directly. You can also email us at {mail}, and we&apos;ll pass your request along and help where we can.</p>
    </>,
  },
  {
    id: "retention", title: "How long we keep it",
    body: <>
      <ul>
        <li><strong>Account and site data</strong> are kept while your account is open. If you delete your account, we delete your sites, content, uploads and leads from our live systems within {LEGAL.deletionDays} days. Copies in backups roll off within a further {LEGAL.backupDays} days.</li>
        <li><strong>Form submissions</strong> are kept until the agent deletes them or closes their account.</li>
        <li><strong>Server logs</strong> are kept for a limited time for security and troubleshooting.</li>
        <li>We may keep some information longer when the law requires it, such as billing records, or to resolve disputes and enforce our Terms.</li>
      </ul>
    </>,
  },
  {
    id: "security", title: "Security",
    body: <p>We use reasonable safeguards to protect personal information. These include encryption in transit (HTTPS), encryption at rest for stored data, encrypting sign-in tokens for connected accounts, access controls that keep each account&apos;s data separate, and limiting which staff can see personal information. No system is perfectly secure. If a breach affects your personal information, we&apos;ll notify you as the law requires.</p>,
  },
  {
    id: "rights", title: "Your choices and rights",
    body: <>
      <p>You can view and change most of your information in the dashboard at any time. You can also ask us to:</p>
      <ul>
        <li>Give you a copy of your personal information, or export your content.</li>
        <li>Correct information that&apos;s wrong.</li>
        <li>Delete your account and personal information.</li>
        <li>Stop sending you product news (use the unsubscribe link in any such email).</li>
      </ul>
      <p>Email {mail} from the address on your account to make a request. We&apos;ll confirm we&apos;ve received it within 10 business days and respond within 45 days. If we need more time, we&apos;ll tell you why.</p>

      <h3>California residents</h3>
      <p>Under the California Consumer Privacy Act (CCPA), you have the right to:</p>
      <ul>
        <li>Know what personal information we collect, use and disclose, and get a copy of it.</li>
        <li>Have it corrected or deleted.</li>
        <li>Opt out of its sale or sharing. We don&apos;t sell or share personal information.</li>
        <li>Limit the use of sensitive personal information. We use sensitive information, such as your account password, only as needed to provide the Service.</li>
        <li>Not be treated differently for using these rights.</li>
      </ul>
      <p>In the past 12 months, we&apos;ve collected the categories of personal information below, from the sources and for the purposes described above. We disclosed each of them to the service providers listed in <a href="#share">How we share it</a> for business purposes.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead><tr><th className="py-2 pr-4 font-semibold">Category</th><th className="py-2 font-semibold">Examples</th></tr></thead>
          <tbody>{CATEGORIES.map(([cat, ex]) => <tr key={cat} className="border-t" style={{ borderColor: "#E2D9CB" }}><td className="py-2 pr-4 font-medium">{cat}</td><td className="py-2">{ex}</td></tr>)}</tbody>
        </table>
      </div>
      <p>You can use an authorized agent to make a request for you; we&apos;ll ask for proof that they&apos;re authorized. To protect your account, we verify requests by confirming them from the email address on the account.</p>

      <h3>Other states</h3>
      <p>Residents of other states with privacy laws, such as Colorado, Connecticut, Virginia, Texas and Oregon, have similar rights. Email {mail} to use them. If we deny your request, you can appeal by replying to our decision, and we&apos;ll respond to the appeal within the time your state&apos;s law requires.</p>
    </>,
  },
  {
    id: "children", title: "Children",
    body: <p>The Service is for real estate professionals. It isn&apos;t directed to children, and we don&apos;t knowingly collect personal information from anyone under 16. If you believe a child has given us personal information, email {mail} and we&apos;ll delete it.</p>,
  },
  {
    id: "location", title: "Where information is stored",
    body: <p>{P} is based in the United States, and we store and process information in the United States. If you use the Service from another country, your information will be transferred to the U.S., where privacy laws may differ from those where you live.</p>,
  },
  {
    id: "changes", title: "Changes to this policy",
    body: <p>We&apos;ll update this policy as the Service changes. The date at the top shows when it last changed. If we make a significant change, we&apos;ll email account holders or show a notice in the dashboard before it takes effect.</p>,
  },
  {
    id: "contact", title: "Contact us",
    body: <p>For privacy questions or requests, email {mail}.</p>,
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="privacy policy"
      title="Privacy Policy"
      other={{ href: "/terms", label: "Terms of Service" }}
      summary={<>
        <p>We collect what we need to build and run your website, and we don&apos;t sell personal information.</p>
        <p>Leads from your site go to you. We hold them for you and don&apos;t market to those people.</p>
        <p>Our AI provider doesn&apos;t train its models on your content. You can export or delete your data whenever you like.</p>
      </>}
      sections={sections}
    />
  );
}
