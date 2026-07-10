import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CandidateProfileLoading() {
  return (
    <section className="py-10 sm:py-14" aria-label="Loading candidate profile">
      <div className="mx-auto grid max-w-6xl animate-pulse gap-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-muted h-36 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-6">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <div className="bg-muted h-6 w-36 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="bg-muted h-20 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="bg-muted h-6 w-32 rounded" />
            </CardHeader>
            <CardContent>
              <div className="bg-muted h-28 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
