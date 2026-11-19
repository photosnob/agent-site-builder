import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/lib/legal";
import { appUrl } from "@/lib/siteUrls";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | Launch & List" },
  description: "The terms for using Launch & List, the website builder for real estate agents.",
  alternates: { canonical: `${appUrl()}/terms` },
};

const { company: C, product: P, email: E } = LEGAL;
const mail = <a href={`mailto:${E}`}>{E}</a>;

const sections: LegalSection[] = [
  {
    id: "agreement", title: "These terms",
    body: <>
      <p>These Terms of Service (the &ldquo;Terms&rdquo;) are an agreement between you and {C} (&ldquo;{P},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). They cover your use of {LEGAL.site}, the {P} dashboard, and the websites, tools and services we provide (together, the &ldquo;Service&rdquo;).</p>
      <p>By creating an account or using the Service, you agree to these Terms and to our <a href="/privacy">Privacy Policy</a>. If you use the Service for a brokerage, team or other business, you confirm you&apos;re authorized to accept these Terms for it, and &ldquo;you&rdquo; includes that business.</p>
      <p>The Service is built for real estate professionals. You must be at least 18 years old to create an account.</p>
    </>,
  },
  {
    id: "service", title: "What the Service does",
    body: <>
      <p>{P} helps you build, edit and publish a website. That includes templates, hosting, an editor that makes changes when you describe them in plain language, tools to import content and listings from websites you point us to, lead forms, a blog, and options to connect your own domain, analytics tags and social accounts.</p>
      <p>We keep improving the Service, so features may change. If we remove something important you&apos;re paying for, we&apos;ll give you reasonable notice.</p>
    </>,
  },
  {
    id: "account", title: "Your account",
    body: <>
      <ul>
        <li>Give us accurate information, and keep it up to date.</li>
        <li>Keep your password private. You&apos;re responsible for what happens in your account, so tell us right away at {mail} if you think someone else has gotten in.</li>
        <li>One person per login. Don&apos;t share accounts or resell the Service without our written permission.</li>
      </ul>
    </>,
  },
  {
    id: "content", title: "Your content",
    body: <>
      <p>&ldquo;Your Content&rdquo; means everything you or your team put into the Service or ask us to bring in: text, photos, videos, logos, headshots, listings, reviews, blog posts, and the information we import from websites and accounts you point us to.</p>
      <p><strong>You own Your Content.</strong> You give us a worldwide, non-exclusive, royalty-free license to host, copy, store, process, adapt (for example, resizing photos or rewriting text when you ask), display and publish Your Content, only as needed to run and improve the Service for you. This license ends when Your Content is deleted from the Service, except for copies in backups for a limited time, or content you&apos;ve already shared with others. We won&apos;t feature your website in our own marketing without your permission.</p>
      <p>You confirm that you have the rights to Your Content and to let us use it this way. That matters especially for:</p>
      <ul>
        <li><strong>Listing photos and descriptions.</strong> They often belong to a photographer, a brokerage or an MLS. Use them only as your agreements with those owners allow.</li>
        <li><strong>Imports.</strong> Only ask us to import from websites and profiles that are yours, or that you&apos;re authorized to copy from.</li>
        <li><strong>Reviews and testimonials.</strong> Only publish real ones from real clients, and follow the rules of the platform they came from.</li>
      </ul>
    </>,
  },
  {
    id: "ai", title: "AI-generated content",
    body: <>
      <p>Parts of the Service use artificial intelligence to write and change your site, such as a first draft of your pages, bios, headlines and edits you ask for. AI can make mistakes. It can get facts wrong, include claims that aren&apos;t true for you, or use wording that isn&apos;t right for your market.</p>
      <p><strong>Review everything before you publish.</strong> You&apos;re responsible for what your website says once you publish it, whether you wrote it or the AI did. Our compliance checks, such as fair housing warnings, are there to help you. They don&apos;t catch everything and aren&apos;t legal advice.</p>
      <p>We don&apos;t allow the AI providers we use to train their models on Your Content.</p>
    </>,
  },
  {
    id: "compliance", title: "Real estate rules are your responsibility",
    body: <>
      <p>You&apos;re responsible for making sure your website and how you use it follow the laws and rules that apply to you. These include:</p>
      <ul>
        <li>Fair housing laws, including the federal Fair Housing Act and state and local equivalents.</li>
        <li>Real estate license and advertising rules, such as showing your brokerage&apos;s name and your license number where your state requires them.</li>
        <li>MLS, IDX and brokerage policies about displaying listings, sold data and photos.</li>
        <li>Rules for contacting people who submit your forms, such as the Telephone Consumer Protection Act (TCPA) and CAN-SPAM, and do-not-call rules.</li>
        <li>Privacy laws that apply to the people who visit your site and send you leads (see <a href="#leads">Leads and your visitors</a>).</li>
      </ul>
    </>,
  },
  {
    id: "acceptable-use", title: "Acceptable use",
    body: <>
      <p>Don&apos;t use the Service to:</p>
      <ul>
        <li>Publish anything that discriminates based on a protected class, or steers buyers or renters.</li>
        <li>Publish false or misleading content, such as listings you don&apos;t represent, made-up sales figures, fake reviews, or pretending to be another agent, brokerage or business.</li>
        <li>Post content that infringes anyone&apos;s copyright, trademark, privacy or other rights, or that is illegal, defamatory, harassing or sexually explicit.</li>
        <li>Send spam, collect people&apos;s information without permission, or run phishing or other scams.</li>
        <li>Upload malware, try to break into or overload the Service, get around usage limits or security, or scrape the Service.</li>
        <li>Use the import tools on websites you aren&apos;t authorized to copy, or reverse-engineer the Service.</li>
      </ul>
      <p>If we believe content or activity breaks these Terms or the law, we may remove the content, unpublish the site, or suspend the account. When it&apos;s reasonable, we&apos;ll tell you first and give you a chance to fix it.</p>
    </>,
  },
  {
    id: "leads", title: "Leads and your visitors",
    body: <>
      <p>When people use the forms on your website, we collect what they submit for you and send it to you. For that information, you decide how it&apos;s used, and we handle it on your behalf as your service provider. We use it only to provide the Service to you, and we don&apos;t sell it or use it to market to those people ourselves.</p>
      <p>You agree to use leads only as the law allows and as you&apos;ve told those people you would. If you add analytics or advertising tags to your site (for example Google Analytics or a Meta pixel), you&apos;re responsible for the notices and consents those tags require. That includes having a privacy notice for your own website where the law requires one.</p>
    </>,
  },
  {
    id: "third-party", title: "Other services you connect",
    body: <>
      <p>You can connect services we don&apos;t run, such as your domain registrar, Instagram, Google, Meta or LinkedIn. Your use of them is covered by their own terms. We aren&apos;t responsible for them, and they may change or stop working with us.</p>
      <p><strong>Custom domains.</strong> You keep ownership of your domain, and you&apos;re responsible for keeping it registered and for the DNS settings at your registrar. We aren&apos;t a domain registrar.</p>
    </>,
  },
  {
    id: "billing", title: "Plans, trials and billing",
    body: <>
      <p>{P} is free while it&apos;s in early access. We&apos;ll tell you before paid plans begin, and you won&apos;t be charged unless you choose a paid plan.</p>
      <p>When paid plans are available, these terms apply:</p>
      <ul>
        <li><strong>Free trial.</strong> New paid accounts may start with a free trial. Before your trial ends, we&apos;ll remind you of the price and when billing starts.</li>
        <li><strong>Automatic renewal.</strong> Paid plans renew automatically each billing period (for example, monthly) at the price shown when you subscribed. Renewals continue until you cancel.</li>
        <li><strong>Cancel anytime.</strong> You can cancel online in your account settings, or by emailing {mail}. Cancellation takes effect at the end of your current billing period, and your site stays live until then. If you cancel during a trial, you won&apos;t be charged.</li>
        <li><strong>Refunds.</strong> Except where the law requires otherwise, payments aren&apos;t refundable, including for partial billing periods.</li>
        <li><strong>Price changes.</strong> We&apos;ll give you at least 30 days&apos; notice before a price increase applies to you, so you can cancel before it does.</li>
        <li><strong>Payments and taxes.</strong> Payments are handled by our payment processor, and we don&apos;t store full card numbers. Prices don&apos;t include taxes unless they say so. If a payment fails, we may pause paid features until it&apos;s resolved.</li>
      </ul>
    </>,
  },
  {
    id: "ours", title: "Our property",
    body: <>
      <p>The Service is ours, including its software, templates, designs, the {P} name and logo, and our stock photos and videos. These Terms give you a limited, non-exclusive, non-transferable right to use the Service, and to use our templates and stock media as part of your website on {P}, while your account is active.</p>
      <p>If you send us feedback or ideas, we can use them without owing you anything.</p>
    </>,
  },
  {
    id: "copyright", title: "Copyright complaints",
    body: <>
      <p>If you believe something on a site we host infringes your copyright, email {mail} with:</p>
      <ul>
        <li>The work you believe was copied.</li>
        <li>The web address where it appears.</li>
        <li>Your contact information.</li>
        <li>A statement that you have a good-faith belief the use isn&apos;t authorized.</li>
        <li>A statement, under penalty of perjury, that your notice is accurate and that you own the copyright or are authorized to act for the owner.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p>We&apos;ll respond to valid notices, which may include removing the content. Account holders who repeatedly infringe will have their accounts closed.</p>
    </>,
  },
  {
    id: "ending", title: "Cancelling and closing accounts",
    body: <>
      <p>You can stop using the Service and ask us to delete your account at any time.</p>
      <p>We may suspend or close your account if you seriously or repeatedly break these Terms, don&apos;t pay, or if we&apos;re required to by law. We may also stop offering the Service entirely; if we do, we&apos;ll give you at least 30 days&apos; notice and a way to export Your Content.</p>
      <p>When an account closes, its website is unpublished and its data is deleted as described in our <a href="/privacy#retention">Privacy Policy</a>. Export anything you want to keep before then. Sections that by their nature should continue after closing will continue, including ownership, disclaimers, limits on liability, indemnity and disputes.</p>
    </>,
  },
  {
    id: "disclaimers", title: "Disclaimers",
    body: <>
      <p>We work hard to keep the Service running, but we provide it <strong>&ldquo;as is&rdquo; and &ldquo;as available.&rdquo;</strong> To the extent the law allows, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, title and non-infringement. We don&apos;t promise that the Service will be uninterrupted or error-free, or that AI-generated content, imported data or compliance checks will be accurate or complete.</p>
      <p>The Service doesn&apos;t give legal, tax or compliance advice, and nothing it produces is a guarantee of leads, rankings or sales.</p>
    </>,
  },
  {
    id: "liability", title: "Limits on liability",
    body: <>
      <p>To the extent the law allows, {C} won&apos;t be liable for any indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, leads, data or goodwill, arising from or related to the Service, even if we were told they were possible.</p>
      <p>Our total liability for all claims related to the Service is limited to the greater of (a) what you paid us in the 12 months before the event that led to the claim, or (b) $100.</p>
      <p>Some places don&apos;t allow these limits, so they may not all apply to you.</p>
    </>,
  },
  {
    id: "indemnity", title: "Indemnity",
    body: <p>If someone brings a claim against us because of Your Content, your website, how you use leads, or your breaking these Terms or the law, you&apos;ll defend us and cover the resulting losses, damages and reasonable legal fees. We&apos;ll tell you about the claim promptly and let you control the defense, and you won&apos;t settle a claim that admits fault on our part without our permission.</p>,
  },
  {
    id: "disputes", title: "Governing law and disputes",
    body: <>
      <p>These Terms are governed by the laws of the State of {LEGAL.governingState}, without regard to its conflict-of-laws rules.</p>
      <p>If you have a problem, email {mail} first, and we&apos;ll try in good faith to resolve it within 30 days. If we can&apos;t, any legal action must be brought in the state or federal courts located in {LEGAL.venue}, and both of us agree to those courts&apos; jurisdiction. Either of us may bring a qualifying claim in small claims court instead.</p>
    </>,
  },
  {
    id: "changes", title: "Changes to these terms",
    body: <p>We may update these Terms. If a change is significant, we&apos;ll email you or show a notice in your dashboard at least 30 days before it takes effect. Continuing to use the Service after that date means you accept the new Terms; if you don&apos;t agree, you can cancel before then.</p>,
  },
  {
    id: "general", title: "The rest",
    body: <>
      <p>These Terms and our Privacy Policy are the whole agreement between us about the Service. If any part can&apos;t be enforced, the rest still applies. If we don&apos;t enforce a right right away, we haven&apos;t given it up. You can&apos;t transfer these Terms without our consent. We may transfer them as part of a merger, acquisition or sale of assets. Neither of us is responsible for delays caused by events beyond reasonable control.</p>
      <p>We&apos;ll send notices to the email on your account; send yours to {mail}.</p>
    </>,
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="terms of service"
      title="Terms of Service"
      other={{ href: "/privacy", label: "Privacy Policy" }}
      summary={<>
        <p>You own your content. We host it and use it only to run your site.</p>
        <p>The AI writes drafts, but you review and approve what goes live, and you&apos;re responsible for following fair housing, licensing and MLS rules.</p>
        <p>{P} is free during early access. Paid plans, when they arrive, renew monthly and you can cancel online anytime.</p>
      </>}
      sections={sections}
    />
  );
}
