import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/pages/PublicInfoPage";
import { PhotoPanel } from "@/components/pages/Photos";

export const metadata: Metadata = {
  title: "Mortgage guide | Meridian",
  description: "A clear, practical guide to preparing for a mortgage and buying a home.",
};

export default function MortgagePage() {
  return <PublicInfoPage
    eyebrow="Home finance"
    title="A more confident first step toward home."
    intro="Buying a home is a big decision. Use this guide to understand the usual mortgage steps, prepare your questions and get a clearer picture of the costs involved."
    sections={[
      { title: "Understand your budget", body: "Consider your regular income and outgoings, the deposit you may have available, and a monthly payment that leaves room for other costs and changes in circumstance." },
      { title: "Look beyond the deposit", body: "A home purchase can include legal, valuation, survey, moving and arrangement costs. Ask which fees apply and when they are due." },
      { title: "Compare the full mortgage", body: "Review the interest rate, whether it is fixed or variable, the mortgage term, fees, early repayment conditions and total amount repayable." },
      { title: "Prepare for an application", body: "Lenders may ask for proof of identity, income, employment, regular spending, deposit source and details about the property. Requirements differ by lender." },
      { title: "Get advice before deciding", body: "Mortgage eligibility, affordability checks, rates and terms vary. Speak with a qualified mortgage adviser or lender about your own circumstances before committing." },
    ]}
    resources={[
      { label: "GOV.UK: Preparing to buy a home", href: "https://www.gov.uk/buying-a-home/preparing-to-buy" },
      { label: "MoneyHelper: Mortgage fees and costs", href: "https://www.moneyhelper.org.uk/en/homes/buying-a-home/estimate-your-overall-buying-and-moving-costs" },
    ]}
    illustration={<PhotoPanel src="/images/mortgage-home.jpg" alt="A Victorian terraced house with a deep green front door" width={1200} height={900} />}
    action={{ label: "View lending options", href: "/loans" }}
  />;
}
