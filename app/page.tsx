import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <p className="font-semibold">Leo-læreren</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        Matte, ett steg om gangen.
      </h1>
      <p>Her skal du få utforske, prøve og lære i ditt eget tempo.</p>
      <section
        aria-labelledby="status"
        className="rounded-2xl border border-border bg-white p-6"
      >
        <h2 id="status" className="mb-3 text-2xl font-semibold">
          Vi gjør klart til matteeventyret
        </h2>
        <p>Øving og innlogging kommer snart.</p>
        <Button className="mt-6" disabled>
          Start øving
        </Button>
      </section>
    </main>
  );
}
