import { OnboardingCarousel } from "@/components/onboarding-carousel"

export default function Page() {
  return (
    <main className="w-full h-full" style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <OnboardingCarousel />
    </main>
  )
}
