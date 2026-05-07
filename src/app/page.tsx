import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ForWho from "@/components/ForWho";
import Problems from "@/components/Problems";
import Solution from "@/components/Solution";
import HowItWorks from "@/components/HowItWorks";
import WhyChoose from "@/components/WhyChoose";
import Vision from "@/components/Vision";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ForWho />
      <Problems />
      <Solution />
      <HowItWorks />
      <WhyChoose />
      <Vision />
      <CTA />
      <Footer />
    </main>
  );
}
