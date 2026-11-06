import { Preloader } from "@/components/Preloader";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Experience } from "@/components/Experience";
import { Work } from "@/components/Work";
import { StackMarquee } from "@/components/StackMarquee";
import { Footer } from "@/components/Footer";
import { ToTop } from "@/components/ToTop";

export default function Home() {
  return (
    <>
      <Preloader />
      <Nav />
      <main className="relative z-10 overflow-hidden rounded-b-[48px] bg-night md:rounded-b-[64px]">
        <Hero />
        <Manifesto />
        <Work />
        <Experience />
        <StackMarquee />
      </main>
      <Footer />
      <ToTop />
    </>
  );
}
