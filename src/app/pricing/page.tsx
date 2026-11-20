import Link from "next/link";

const plans = [
    {
        name: "Free",
        price: "KES 0",
        description: "For testing DukaFlow with a small business.",
        features: ["1 business", "50 products", "100 sales per month", "Basic reports"],
        featured: false,
    },
    {
        name: "Starter",
        price: "KES 1,500",
        description: "For growing shops that need reliable daily operations.",
        features: ["1 business", "500 products", "Unlimited sales", "Inventory alerts", "Team members"],
        featured: true,
    },
    {
        name: "Business",
        price: "KES 4,000",
        description: "For established teams that need deeper control and reporting.",
        features: ["Unlimited products", "Unlimited sales", "Advanced reports", "Priority support", "Multiple branches ready"],
        featured: false,
    },
];

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12 sm:py-20">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between">
                    <Link href="/" className="font-bold tracking-wide text-emerald-700">DUKAFLOW</Link>
                    <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
                </div>

                <section className="mx-auto max-w-3xl py-16 text-center sm:py-20">
                    <p className="font-semibold uppercase tracking-widest text-emerald-700">Simple, honest pricing</p>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">Choose the plan that fits your shop.</h1>
                    <p className="mt-6 text-lg text-slate-600">Start free. Upgrade when your business needs more capacity. No setup fees.</p>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article key={plan.name} className={`relative rounded-2xl border bg-white p-8 shadow-sm ${plan.featured ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                            {plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Most popular</span>}
                            <h2 className="text-2xl font-bold">{plan.name}</h2>
                            <p className="mt-3 min-h-12 text-sm text-slate-600">{plan.description}</p>
                            <p className="mt-6 text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-slate-500"> / month</span></p>
                            <Link href="/register" className={`mt-8 block rounded-lg px-4 py-3 text-center font-semibold ${plan.featured ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-slate-300 hover:bg-slate-50"}`}>Start with {plan.name}</Link>
                            <ul className="mt-8 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700">
                                {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                            </ul>
                        </article>
                    ))}
                </section>

                <p className="mt-12 text-center text-sm text-slate-500">Annual billing and payment integrations are coming soon. Your account remains free until you choose a paid plan.</p>
            </div>
        </main>
    );
}
