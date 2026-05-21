'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Minus, Plus, Shield, Clock, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PassengerData {
  firstName: string;
  lastName: string;
  type: 'adult' | 'child' | 'infant';
  passportNumber: string;
  nationality: string;
}

export interface ContactData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface FlightData {
  direction: 'arrival' | 'departure' | '';
  flightNumber: string;
  dateTime: string;
  terminal: string;
  originDestIata: string;
}

export interface BookingFormData {
  passengerCount: number;
  serviceDate: string;
  passengers: PassengerData[];
  contact: ContactData;
  flight: FlightData;
  specialRequests: string;
}

interface SummaryProps {
  serviceName?: string | undefined;
  airportName: string;
  iataCode: string;
  city: string;
  country: string;
  fromPriceDisplay?: string | undefined;
  pricingCurrency?: string | undefined;
  imageUrl?: string | undefined;
  imageAlt?: string | undefined;
  imgVariant?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface PrefillData {
  date?: string;
  adults?: number;
  children?: number;
  infants?: number;
}

interface PassengersStepProps {
  slug: string;
  serviceId?: string | undefined;
  passengerPricing?: Record<string, number> | null;
  prefill?: PrefillData;
  summary: SummaryProps;
  labels: {
    sectionPassengers: string;
    serviceDate: string;
    sectionLeadPassenger: string;
    sectionPassenger: string;
    sectionContact: string;
    sectionFlight: string;
    sectionFlightHelp: string;
    sectionSpecial: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passengerType: string;
    adult: string;
    child: string;
    infant: string;
    passport: string;
    nationality: string;
    direction: string;
    selectDirection: string;
    arrival: string;
    departure: string;
    flightNumber: string;
    dateTime: string;
    terminal: string;
    originDest: string;
    specialPlaceholder: string;
    optional: string;
    continueButton: string;
    summaryTitle: string;
    summaryService: string;
    summaryAirport: string;
    summaryFrom: string;
    trustSecure: string;
    trustCancel: string;
    trustSupport: string;
    errorRequired: string;
    errorEmail: string;
    errorServiceRequired: string;
  };
}

function createPassenger(): PassengerData {
  return { firstName: '', lastName: '', type: 'adult', passportNumber: '', nationality: '' };
}

function getDefaultServiceDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function createDefaultForm(): BookingFormData {
  return {
    passengerCount: 1,
    serviceDate: getDefaultServiceDate(),
    passengers: [createPassenger()],
    contact: { email: '', phone: '', firstName: '', lastName: '' },
    flight: { direction: '', flightNumber: '', dateTime: '', terminal: '', originDestIata: '' },
    specialRequests: '',
  };
}

type FieldErrorMap = Record<string, string>;

function getErr(errors: FieldErrorMap, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(errors, key) ? errors[key] : undefined;
}

function validateForm(data: BookingFormData, requiredMsg: string, emailMsg: string): FieldErrorMap {
  const errors: FieldErrorMap = {};

  if (!data.serviceDate.trim()) errors['serviceDate'] = requiredMsg;

  data.passengers.forEach((p, i) => {
    if (!p.firstName.trim()) errors[`passenger_${i}_firstName`] = requiredMsg;
    if (!p.lastName.trim()) errors[`passenger_${i}_lastName`] = requiredMsg;
  });

  if (!data.contact.email.trim()) {
    errors['contact_email'] = requiredMsg;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.email)) {
    errors['contact_email'] = emailMsg;
  }
  if (!data.contact.phone.trim()) errors['contact_phone'] = requiredMsg;
  if (!data.contact.firstName.trim()) errors['contact_firstName'] = requiredMsg;
  if (!data.contact.lastName.trim()) errors['contact_lastName'] = requiredMsg;

  return errors;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  optional?: boolean;
  optionalLabel?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, optional, optionalLabel, children }: FieldProps) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="block mb-2">
        {label}
        {optional && <span className="text-ink-3 font-normal ms-1">({optionalLabel})</span>}
      </Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const selectClass =
  'flex h-11 w-full rounded-full border border-line bg-surface px-5 py-2 text-sm text-ink transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:border-transparent';

export function PassengersStep({ slug, serviceId, passengerPricing, prefill, summary, labels }: PassengersStepProps) {
  const router = useRouter();
  const [form, setForm] = useState<BookingFormData>(() => {
    const base = createDefaultForm();
    if (!prefill) return base;
    const adults = prefill.adults ?? 1;
    const children = prefill.children ?? 0;
    const infants = prefill.infants ?? 0;
    const total = Math.min(9, Math.max(1, adults + children + infants));
    const passengers: PassengerData[] = [];
    for (let i = 0; i < adults && passengers.length < total; i++) passengers.push({ ...createPassenger(), type: 'adult' });
    for (let i = 0; i < children && passengers.length < total; i++) passengers.push({ ...createPassenger(), type: 'child' });
    for (let i = 0; i < infants && passengers.length < total; i++) passengers.push({ ...createPassenger(), type: 'infant' });
    return {
      ...base,
      passengerCount: passengers.length,
      passengers,
      serviceDate: prefill.date ?? base.serviceDate,
    };
  });
  const [errors, setErrors] = useState<FieldErrorMap>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setPassengerCount(count: number) {
    const clamped = Math.min(9, Math.max(1, count));
    const currentPassengers = form.passengers;
    const newPassengers: PassengerData[] = Array.from({ length: clamped }, (_, i) =>
      currentPassengers[i] ?? createPassenger()
    );
    setForm((prev) => ({ ...prev, passengerCount: clamped, passengers: newPassengers }));
  }

  function updatePassenger(index: number, field: keyof PassengerData, value: string) {
    setForm((prev) => {
      const passengers = prev.passengers.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      );
      return { ...prev, passengers };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`passenger_${index}_${field}`];
      return next;
    });
  }

  function updateContact(field: keyof ContactData, value: string) {
    setForm((prev) => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`contact_${field}`];
      return next;
    });
  }

  function updateFlight(field: keyof FlightData, value: string) {
    setForm((prev) => ({ ...prev, flight: { ...prev.flight, [field]: value } }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!serviceId) {
      setSubmitError(labels.errorServiceRequired);
      return;
    }
    const validationErrors = validateForm(form, labels.errorRequired, labels.errorEmail);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[data-field="${firstErrorKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    sessionStorage.setItem('airportfaster_booking_form', JSON.stringify(form));
    if (serviceId) {
      sessionStorage.setItem('airportfaster_booking_serviceId', serviceId);
    }
    sessionStorage.removeItem('airportfaster_draft_booking');
    sessionStorage.removeItem('airportfaster_manage_token');

    router.push(`/airports/${slug}/book/review${serviceId ? `?serviceId=${serviceId}` : ''}`);
  }

  const pp = passengerPricing;
  const hasPerTypePricing = pp != null && ('adult' in pp || 'child' in pp || 'infant' in pp);
  const liveTotalMinor = hasPerTypePricing && pp != null
    ? form.passengers.reduce((sum, p) => {
        const adultMinor = pp['adult'] ?? 0;
        const typeMinor = p.type === 'child'
          ? (pp['child'] != null ? pp['child'] : adultMinor)
          : p.type === 'infant'
            ? (pp['infant'] != null ? pp['infant'] : adultMinor)
            : adultMinor;
        return sum + typeMinor;
      }, 0)
    : null;

  const trustItems = [
    { icon: Shield, label: labels.trustSecure },
    { icon: Clock, label: labels.trustCancel },
    { icon: HeadphonesIcon, label: labels.trustSupport },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_22rem] gap-8 lg:gap-10">
      {/* Form column */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Passengers count */}
        <Card className="p-6">
          <h2 className="text-body-lg font-semibold text-ink mb-5 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark text-xs font-bold">
              1
            </span>
            {labels.sectionPassengers}
          </h2>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPassengerCount(form.passengerCount - 1)}
              disabled={form.passengerCount <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-2 border border-line text-ink hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-bold text-ink w-8 text-center" dir="ltr">
              {form.passengerCount}
            </span>
            <button
              type="button"
              onClick={() => setPassengerCount(form.passengerCount + 1)}
              disabled={form.passengerCount >= 9}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-2 border border-line text-ink hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 max-w-xs" data-field="serviceDate">
            <Field
              label={labels.serviceDate}
              htmlFor="service-date"
              error={getErr(errors, 'serviceDate')}
            >
              <Input
                id="service-date"
                type="date"
                dir="ltr"
                value={form.serviceDate}
                min={getDefaultServiceDate()}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, serviceDate: e.target.value }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next['serviceDate'];
                    return next;
                  });
                }}
              />
            </Field>
          </div>
        </Card>

        {/* Per-passenger details */}
        {form.passengers.map((passenger, index) => (
          <Card key={index} className="p-6">
            <h2 className="text-body-lg font-semibold text-ink mb-5 flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark text-xs font-bold">
                {index + 2}
              </span>
              {labels.sectionPassenger} {index + 1}
              {index === 0 && (
                <span className="text-xs text-ink-3 font-normal ms-1">
                  ({labels.sectionLeadPassenger})
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={labels.firstName}
                htmlFor={`p-${index}-firstName`}
                error={getErr(errors, `passenger_${index}_firstName`)}
              >
                <Input
                  id={`p-${index}-firstName`}
                  type="text"
                  data-field={`passenger_${index}_firstName`}
                  value={passenger.firstName}
                  onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                  placeholder="John"
                />
              </Field>

              <Field
                label={labels.lastName}
                htmlFor={`p-${index}-lastName`}
                error={getErr(errors, `passenger_${index}_lastName`)}
              >
                <Input
                  id={`p-${index}-lastName`}
                  type="text"
                  data-field={`passenger_${index}_lastName`}
                  value={passenger.lastName}
                  onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                  placeholder="Smith"
                />
              </Field>

              <Field label={labels.passengerType} htmlFor={`p-${index}-type`}>
                <select
                  id={`p-${index}-type`}
                  value={passenger.type}
                  onChange={(e) => updatePassenger(index, 'type', e.target.value)}
                  className={selectClass}
                >
                  <option value="adult">{labels.adult}</option>
                  <option value="child">{labels.child}</option>
                  <option value="infant">{labels.infant}</option>
                </select>
              </Field>

              <Field
                label={labels.passport}
                htmlFor={`p-${index}-passport`}
                optional
                optionalLabel={labels.optional}
              >
                <Input
                  id={`p-${index}-passport`}
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => updatePassenger(index, 'passportNumber', e.target.value)}
                  placeholder="AB1234567"
                  dir="ltr"
                />
              </Field>

              <Field
                label={labels.nationality}
                htmlFor={`p-${index}-nationality`}
                optional
                optionalLabel={labels.optional}
              >
                <Input
                  id={`p-${index}-nationality`}
                  type="text"
                  value={passenger.nationality}
                  onChange={(e) => updatePassenger(index, 'nationality', e.target.value.toUpperCase())}
                  placeholder="GB"
                  maxLength={2}
                  dir="ltr"
                />
              </Field>
            </div>
          </Card>
        ))}

        {/* Contact details */}
        <Card className="p-6">
          <h2 className="text-body-lg font-semibold text-ink mb-5 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark text-xs font-bold">
              {form.passengers.length + 2}
            </span>
            {labels.sectionContact}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={labels.firstName}
              htmlFor="contact-firstName"
              error={getErr(errors, 'contact_firstName')}
            >
              <Input
                id="contact-firstName"
                type="text"
                data-field="contact_firstName"
                value={form.contact.firstName}
                onChange={(e) => updateContact('firstName', e.target.value)}
                placeholder="John"
              />
            </Field>

            <Field
              label={labels.lastName}
              htmlFor="contact-lastName"
              error={getErr(errors, 'contact_lastName')}
            >
              <Input
                id="contact-lastName"
                type="text"
                data-field="contact_lastName"
                value={form.contact.lastName}
                onChange={(e) => updateContact('lastName', e.target.value)}
                placeholder="Smith"
              />
            </Field>

            <Field
              label={labels.email}
              htmlFor="contact-email"
              error={getErr(errors, 'contact_email')}
            >
              <Input
                id="contact-email"
                type="email"
                dir="ltr"
                data-field="contact_email"
                value={form.contact.email}
                onChange={(e) => updateContact('email', e.target.value)}
                placeholder="john@example.com"
              />
            </Field>

            <Field
              label={labels.phone}
              htmlFor="contact-phone"
              error={getErr(errors, 'contact_phone')}
            >
              <Input
                id="contact-phone"
                type="tel"
                dir="ltr"
                data-field="contact_phone"
                value={form.contact.phone}
                onChange={(e) => updateContact('phone', e.target.value)}
                placeholder="+44 7700 900000"
              />
            </Field>
          </div>
        </Card>

        {/* Flight details */}
        <Card className="p-6">
          <h2 className="text-body-lg font-semibold text-ink mb-1 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark text-xs font-bold">
              {form.passengers.length + 3}
            </span>
            {labels.sectionFlight}
            <span className="text-xs text-ink-3 font-normal">({labels.optional})</span>
          </h2>
          <p className="text-sm text-ink-3 mb-5 ms-10">{labels.sectionFlightHelp}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={labels.direction}
              htmlFor="flight-direction"
              optional
              optionalLabel={labels.optional}
            >
              <select
                id="flight-direction"
                value={form.flight.direction}
                onChange={(e) => updateFlight('direction', e.target.value)}
                className={selectClass}
              >
                <option value="">{labels.selectDirection}</option>
                <option value="arrival">{labels.arrival}</option>
                <option value="departure">{labels.departure}</option>
              </select>
            </Field>

            <Field
              label={labels.flightNumber}
              htmlFor="flight-number"
              optional
              optionalLabel={labels.optional}
            >
              <Input
                id="flight-number"
                type="text"
                dir="ltr"
                value={form.flight.flightNumber}
                onChange={(e) => updateFlight('flightNumber', e.target.value)}
                placeholder="EK001"
              />
            </Field>

            <Field
              label={labels.dateTime}
              htmlFor="flight-datetime"
              optional
              optionalLabel={labels.optional}
            >
              <Input
                id="flight-datetime"
                type="datetime-local"
                dir="ltr"
                value={form.flight.dateTime}
                onChange={(e) => updateFlight('dateTime', e.target.value)}
              />
            </Field>

            <Field
              label={labels.terminal}
              htmlFor="flight-terminal"
              optional
              optionalLabel={labels.optional}
            >
              <Input
                id="flight-terminal"
                type="text"
                value={form.flight.terminal}
                onChange={(e) => updateFlight('terminal', e.target.value)}
                placeholder="T3"
              />
            </Field>

            <Field
              label={labels.originDest}
              htmlFor="flight-iata"
              optional
              optionalLabel={labels.optional}
            >
              <Input
                id="flight-iata"
                type="text"
                dir="ltr"
                value={form.flight.originDestIata}
                onChange={(e) => updateFlight('originDestIata', e.target.value.toUpperCase())}
                placeholder="LHR"
                maxLength={3}
              />
            </Field>
          </div>
        </Card>

        {/* Special requests */}
        <Card className="p-6">
          <h2 className="text-body-lg font-semibold text-ink mb-4 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-dark text-xs font-bold">
              {form.passengers.length + 4}
            </span>
            {labels.sectionSpecial}
            <span className="text-xs text-ink-3 font-normal">({labels.optional})</span>
          </h2>

          <Textarea
            value={form.specialRequests}
            onChange={(e) => setForm((prev) => ({ ...prev, specialRequests: e.target.value }))}
            placeholder={labels.specialPlaceholder}
            rows={3}
          />
        </Card>

        {/* Submit */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="gold" size="lg">
            {labels.continueButton}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </form>

      {/* Summary column */}
      <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
        <Card className="overflow-hidden">
          <div
            className={cn(
              'relative aspect-[16/9]',
              !summary.imageUrl && `img-placeholder-${summary.imgVariant ?? 2}`
            )}
          >
            {summary.imageUrl && (
              <Image
                src={summary.imageUrl}
                alt={summary.imageAlt ?? summary.airportName}
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-cover object-center"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute bottom-3 start-3 inline-flex items-center gap-2 bg-white/95 text-ink rounded-full px-3 py-1 text-xs font-mono font-bold" dir="ltr">
              {summary.iataCode}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-overline uppercase text-ink-3">{labels.summaryTitle}</p>
              <h3 className="text-body-lg font-semibold text-ink mt-1">
                {summary.serviceName ?? summary.airportName}
              </h3>
              <p className="text-sm text-ink-2 mt-0.5">
                {summary.airportName} · {summary.city}, {summary.country}
              </p>
            </div>

            {(hasPerTypePricing && liveTotalMinor != null) ? (
              <div className="pt-3 border-t border-line">
                <div className="flex items-end justify-between">
                  <p className="text-xs text-ink-3">Total</p>
                  <p className="text-2xl font-bold text-brand-gold-dark" dir="ltr">
                    €{(liveTotalMinor / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            ) : summary.fromPriceDisplay ? (
              <div className="pt-3 border-t border-line">
                <div className="flex items-end justify-between">
                  <p className="text-xs text-ink-3">{labels.summaryFrom}</p>
                  <p className="text-2xl font-bold text-ink" dir="ltr">
                    {summary.fromPriceDisplay}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <ul className="space-y-3">
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-ink-2">
                <span className="inline-flex w-8 h-8 rounded-full bg-brand-gold/10 items-center justify-center text-brand-gold-dark shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
