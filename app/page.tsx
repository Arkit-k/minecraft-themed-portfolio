import { Nav } from "@/components/Nav";
import { PortfolioSwitch } from "@/components/PortfolioSwitch";
import { Landing } from "@/components/sections/Landing";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* one or the other, never both: the glance, or the whole portfolio */}
        <PortfolioSwitch
          landing={<Landing />}
          full={
            <>
              <Hero />
              <About />
              <Experience />
              <Projects />
              <Skills />
              <Contact />
            </>
          }
        />
      </main>
    </>
  );
}
