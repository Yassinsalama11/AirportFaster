import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

export default function DesignPage() {
  if (process.env['NODE_ENV'] === 'production') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-brand-black p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-display-lg font-bold text-brand-off-white mb-2">
            Airport<span className="text-brand-gold">Faster</span> Design System
          </h1>
          <p className="text-body-lg text-brand-muted">Kitchen-sink: every primitive for visual QA.</p>
        </div>

        <Separator />

        {/* Typography */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Typography</h2>
          <div className="space-y-4">
            <p className="text-display-2xl font-bold">Display 2XL</p>
            <p className="text-display-xl font-bold">Display XL</p>
            <p className="text-display-lg font-bold">Display LG</p>
            <p className="text-display-md font-semibold">Display MD</p>
            <p className="text-display-sm font-semibold">Display SM</p>
            <p className="text-body-xl">Body XL — lorem ipsum dolor sit amet</p>
            <p className="text-body-lg">Body LG — lorem ipsum dolor sit amet</p>
            <p className="text-body-md">Body MD — lorem ipsum dolor sit amet</p>
            <p className="text-body-sm text-brand-muted">Body SM — lorem ipsum dolor sit amet</p>
            <p className="text-caption text-brand-muted uppercase tracking-widest">Caption / Overline</p>
          </div>
        </section>

        <Separator />

        {/* Buttons */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">XL</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Premium Fast Track</CardTitle>
                <CardDescription>Skip the security queue at Dubai International</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body-sm text-brand-muted">From USD 45 per person</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Book Now</Button>
              </CardFooter>
            </Card>
            <Card className="border-brand-gold/20">
              <CardHeader>
                <CardTitle>Meet &amp; Greet</CardTitle>
                <CardDescription>Personal assistant from arrival to departure</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body-sm text-brand-muted">From USD 120 per person</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Book Now</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Confirmed</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Cancelled</Badge>
            <Badge variant="info">In Progress</Badge>
          </div>
        </section>

        <Separator />

        {/* Form */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Form Elements</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Special Requests</Label>
              <Textarea id="notes" placeholder="Any special requirements..." />
            </div>
            <Button className="w-full" size="lg">Submit</Button>
          </div>
        </section>

        <Separator />

        {/* Skeletons */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Skeletons</h2>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Color Palette */}
        <section>
          <h2 className="text-display-sm font-semibold text-brand-off-white mb-6">Brand Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Black', hex: '#0A0A0A', cls: 'bg-brand-black border border-white/10' },
              { name: 'Navy', hex: '#0D1B2A', cls: 'bg-brand-navy' },
              { name: 'Navy Light', hex: '#1a2d45', cls: 'bg-brand-navy-light' },
              { name: 'Gold', hex: '#C9A84C', cls: 'bg-brand-gold' },
              { name: 'Gold Light', hex: '#E8C97A', cls: 'bg-brand-gold-light' },
              { name: 'Off White', hex: '#F5F5F4', cls: 'bg-brand-off-white' },
              { name: 'White', hex: '#FFFFFF', cls: 'bg-white' },
              { name: 'Muted', hex: '#6B7280', cls: 'bg-brand-muted' },
            ].map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-16 rounded-lg ${color.cls}`} />
                <p className="text-caption text-brand-muted">{color.name}</p>
                <p className="text-caption text-brand-muted/60">{color.hex}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
