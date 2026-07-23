export default function Hero() {
  return (
    <section className="text-center mb-[5rem] sm:mb-[6rem] animate-in fade-in slide-in-from-top-5 duration-700">
      <h1 className="text-[2.5rem] sm:text-[3.5rem] font-[800] tracking-[-0.03em] leading-[1.2] text-[#0f172a] mb-[1.25rem]">
        What would you like{" "}
        <span className="bg-gradient-to-br from-[#2563eb] to-[#8b5cf6] bg-clip-text text-transparent">
          to reserve?
        </span>
      </h1>
      <p className="text-[1.125rem] text-[#64748b] max-w-[680px] mx-auto leading-[1.7] font-[500] text-center">
        Streamlined booking for University facilities and technical equipment. Choose your path to begin the reservation process.
      </p>
    </section>
  );
}
