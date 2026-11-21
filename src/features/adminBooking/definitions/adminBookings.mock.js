// DUMMY bookings for "Booking Management" (Super Admin + Admin). There is no
// bookings API yet. Dates are relative to "now".
//
// Same shape as the provider's bookings (features/providerBooking's mock),
// plus `provider: { id, name, phone, category, rating, jobsDone, vertical }`
// and `vertical: { id, name }`.
//
// The Super Admin sees every vertical. A real Admin will only ever receive
// their own vertical from the API; until then the Admin is shown the demo
// vertical ADMIN_DEMO_VERTICAL_ID (see hooks/useAdminBookings.js).
import { PLATFORM_COMMISSION_RATE } from "@/features/providerBooking/index.js";

export const DUMMY_VERTICALS = [
  { id: "vrt-home", name: "Home Services" },
  { id: "vrt-beauty", name: "Beauty & Wellness" },
  { id: "vrt-pest", name: "Pest Control" },
];
const V = Object.fromEntries(DUMMY_VERTICALS.map((vertical) => [vertical.id.replace("vrt-", ""), vertical]));

// The vertical a (dummy) Admin manages.
export const ADMIN_DEMO_VERTICAL_ID = "vrt-home";

const CONVENIENCE_FEE = 19;
const HOUR = 3600000;

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Every provider, with their vertical - also the Reassign list (filtered to
// the booking's vertical).
export const DUMMY_PROVIDERS = [
  { id: "prv-asha", name: "Asha Saren", phone: "+91 98300 11245", category: "Electrical", rating: 4.8, jobsDone: 312, vertical: V.home },
  { id: "prv-yash", name: "Yash Gupta", phone: "+91 89103 56963", category: "Electrical", rating: 4.8, jobsDone: 287, vertical: V.home },
  { id: "prv-ravi", name: "Ravi Kumar", phone: "+91 90072 11843", category: "Plumbing", rating: 4.7, jobsDone: 540, vertical: V.home },
  { id: "prv-imran", name: "Imran Sheikh", phone: "+91 98311 40267", category: "Appliance repair", rating: 4.6, jobsDone: 198, vertical: V.home },
  { id: "prv-sunita", name: "Sunita Das", phone: "+91 97481 22609", category: "Cleaning", rating: 4.9, jobsDone: 421, vertical: V.home },
  { id: "prv-pooja", name: "Pooja Nair", phone: "+91 90381 66120", category: "Cleaning", rating: 4.7, jobsDone: 156, vertical: V.home },
  { id: "prv-rakesh", name: "Rakesh Mondal", phone: "+91 98742 30558", category: "Painting", rating: 4.5, jobsDone: 133, vertical: V.home },
  { id: "prv-neha", name: "Neha Kapoor", phone: "+91 98364 22107", category: "Salon at home", rating: 4.9, jobsDone: 610, vertical: V.beauty },
  { id: "prv-ritu", name: "Ritu Sharma", phone: "+91 90073 88410", category: "Salon at home", rating: 4.7, jobsDone: 245, vertical: V.beauty },
  { id: "prv-arjun", name: "Arjun Malhotra", phone: "+91 97482 50633", category: "Massage therapy", rating: 4.8, jobsDone: 189, vertical: V.beauty },
  { id: "prv-sanjay", name: "Sanjay Pal", phone: "+91 98311 76002", category: "Pest control", rating: 4.6, jobsDone: 377, vertical: V.pest },
  { id: "prv-bikash", name: "Bikash Roy", phone: "+91 90381 14590", category: "Termite treatment", rating: 4.5, jobsDone: 142, vertical: V.pest },
];
const P = Object.fromEntries(DUMMY_PROVIDERS.map((provider) => [provider.id.replace("prv-", ""), provider]));

const ADDRESSES = {
  ballygunge: { label: "Home", line: "Flat 4B, Sunrise Apartments", area: "12 Lake View Road, Ballygunge", landmark: "Near South Point School", city: "Kolkata", pincode: "700019" },
  saltLake: { label: "Work", line: "7th Floor, Tower 2, Infinity Benchmark", area: "Plot G1, Sector V, Salt Lake", landmark: "", city: "Kolkata", pincode: "700091" },
  newTown: { label: "Home", line: "B-1203, Rosedale Garden", area: "Action Area III, New Town", landmark: "Opp. Eco Park Gate 4", city: "Kolkata", pincode: "700156" },
  behala: { label: "Home", line: "22/1 Diamond Harbour Road", area: "Behala Chowrasta", landmark: "Next to SBI ATM", city: "Kolkata", pincode: "700034" },
  parkStreet: { label: "Office", line: "3rd Floor, Apeejay House", area: "15 Park Street", landmark: "", city: "Kolkata", pincode: "700016" },
  dumdum: { label: "Home", line: "48 Jessore Road", area: "Dum Dum Park", landmark: "Near Tank No. 3", city: "Kolkata", pincode: "700055" },
  gariahat: { label: "Home", line: "Flat 2A, Ganga Niwas", area: "Gariahat Road (South)", landmark: "Behind Pantaloons", city: "Kolkata", pincode: "700068" },
};

const pricingFor = (base, discount = 0, couponCode = null) => {
  const total = base + CONVENIENCE_FEE - discount;
  const commission = Math.round(total * PLATFORM_COMMISSION_RATE);
  return { base, visitingCharge: 0, convenienceFee: CONVENIENCE_FEE, discount, couponCode, total, commission, earning: total - commission };
};

const make = (now, spec) => {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + spec.dayOffset);
  const startDate = new Date(day);
  startDate.setHours(spec.startHour, 0, 0, 0);
  const start = startDate.getTime();
  const hours = spec.hours ?? 1;
  const bookingType = spec.bookingType ?? "service";
  const provider = spec.provider;
  const createdAt =
    spec.status === "pending"
      ? now.getTime() - (spec.receivedMinutesAgo ?? 25) * 60000
      : Math.min(start, now.getTime()) - (spec.bookedDaysBefore ?? 2) * 24 * HOUR;
  const iso = (time) => new Date(time).toISOString();
  const pricing = pricingFor(spec.base, spec.discount, spec.couponCode);
  const accepted = createdAt + 0.6 * HOUR;

  const activity = [
    {
      status: "pending",
      note: bookingType === "worker" ? `Customer booked ${provider.name} directly` : `Booking assigned to ${provider.name}`,
      actor: bookingType === "worker" ? "customer" : "system",
      at: iso(createdAt),
    },
  ];
  const extra = {};
  const reached = ["accepted", "in_progress", "completed", "paid"].indexOf(spec.status);

  // Earlier providers who turned the booking down before the current one got it.
  const previousProviders = (spec.rejectedEarlierBy ?? []).map((entry, index) => {
    const at = iso(createdAt + (index + 1) * 0.25 * HOUR);
    activity.push(
      { status: "rejected", note: `${entry.provider.name} rejected the booking: ${entry.reason}`, actor: "provider", at },
      { status: "pending", note: `Reassigned to ${provider.name}`, actor: "admin", at },
    );
    return { id: entry.provider.id, name: entry.provider.name, outcome: "rejected", reason: entry.reason, at };
  });
  // The booking was first offered to the earliest of them.
  if (previousProviders.length) activity[0].note = `Booking assigned to ${previousProviders[0].name}`;

  if (spec.status === "rejected") {
    activity.push({ status: "rejected", note: `${provider.name} rejected the booking: ${spec.rejectionReason}`, actor: "provider", at: iso(accepted) });
  }
  if (spec.status === "cancelled") {
    if (spec.wasAccepted) activity.push({ status: "accepted", note: `${provider.name} accepted the booking`, actor: "provider", at: iso(accepted) });
    activity.push({ status: "cancelled", note: `Customer cancelled: ${spec.cancellationReason}`, actor: "customer", at: iso(accepted + 3 * HOUR) });
  }
  if (reached >= 0) {
    extra.acceptedAt = iso(accepted);
    activity.push({ status: "accepted", note: `${provider.name} accepted the booking`, actor: "provider", at: extra.acceptedAt });
  }
  if (reached >= 1) {
    extra.startedAt = iso(start + 5 * 60000);
    activity.push({ status: "in_progress", note: `${provider.name} started the job`, actor: "provider", at: extra.startedAt });
  }
  if (reached >= 2) {
    extra.completedAt = iso(start + hours * HOUR - 10 * 60000);
    activity.push({ status: "completed", note: `${provider.name} marked the job as completed`, actor: "provider", at: extra.completedAt });
  }
  if (reached >= 3) {
    const receivedAt = iso(start + hours * HOUR);
    extra.cashPayment = { amountReceived: pricing.total, receivedAt, note: null };
    activity.push({ status: "paid", note: `₹${pricing.total.toLocaleString("en-IN")} cash received by ${provider.name}`, actor: "provider", at: receivedAt });
  }

  return {
    id: spec.id,
    bookingNumber: spec.bookingNumber || spec.id,
    bookingType,
    previousProviders,
    service: spec.service,
    customer: spec.customer,
    provider,
    vertical: provider.vertical,
    address: spec.address,
    scheduledDate: dateKey(day),
    startHour: spec.startHour,
    endHour: spec.startHour + hours,
    hours,
    instructions: spec.instructions ?? "",
    pricing,
    status: spec.status,
    paymentStatus: spec.status === "paid" ? "paid" : "unpaid",
    paymentMethod: "cash",
    cashPayment: null,
    rejectionReason: spec.rejectionReason ?? null,
    cancellationReason: spec.cancellationReason ?? null,
    cancelledBy: spec.status === "cancelled" ? "customer" : null,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    expiresAt: spec.status === "pending" ? iso(createdAt + 2 * HOUR) : null,
    createdAt: iso(createdAt),
    ...extra,
    activity,
  };
};

const S = {
  ac: { name: "AC Repair Service", category: "Appliance repair" },
  tap: { name: "Tap Repair", category: "Plumbing" },
  drain: { name: "Drain & Clog Removal", category: "Plumbing" },
  fan: { name: "Fan & light installation", category: "Electrical" },
  switch: { name: "Switchboard Repair", category: "Electrical" },
  wiring: { name: "House wiring check", category: "Electrical" },
  geyser: { name: "Geyser Repair", category: "Appliance repair" },
  washer: { name: "Washing Machine Repair", category: "Appliance repair" },
  kitchen: { name: "Deep Kitchen Cleaning", category: "Cleaning" },
  bathroom: { name: "Bathroom Cleaning", category: "Cleaning" },
  sofa: { name: "Sofa Cleaning", category: "Cleaning" },
  paint: { name: "Wall Painting (1 room)", category: "Painting" },
  facial: { name: "Facial & clean-up at home", category: "Salon at home" },
  bridal: { name: "Bridal makeup", category: "Salon at home" },
  haircut: { name: "Haircut & styling at home", category: "Salon at home" },
  massage: { name: "Full body massage (60 min)", category: "Massage therapy" },
  cockroach: { name: "Cockroach control", category: "Pest control" },
  general: { name: "General pest control (2BHK)", category: "Pest control" },
  termite: { name: "Termite treatment", category: "Termite treatment" },
};

const C = (name, phone) => ({ name, phone, email: `${name.toLowerCase().replace(/\s+/g, ".")}@yopmail.com` });

export const buildAdminMockBookings = (now = new Date()) => {
  const soon = now.getHours() + 2 <= 19 ? { dayOffset: 0, startHour: now.getHours() + 2 } : { dayOffset: 1, startHour: 10 };
  const ongoingHour = now.getHours() >= 8 && now.getHours() <= 19 ? now.getHours() : 10;

  return [
    // Awaiting provider
    make(now, { id: "FXN-4QH7KD", status: "pending", ...soon, receivedMinutesAgo: 12, provider: P.imran, service: S.ac, customer: C("Riya Sen", "+91 98310 45872"), address: ADDRESSES.ballygunge, base: 499, instructions: "AC is not cooling at all and makes a rattling noise." }),
    make(now, { id: "FXN-9MZP2T", status: "pending", bookingType: "worker", dayOffset: 2, startHour: 15, hours: 2, receivedMinutesAgo: 48, provider: P.yash, service: S.fan, customer: C("Arindam Ghosh", "+91 90073 22814"), address: ADDRESSES.saltLake, base: 698 }),
    make(now, { id: "FXN-2KD8LS", status: "pending", dayOffset: 3, startHour: 11, receivedMinutesAgo: 95, provider: P.ravi, service: S.tap, customer: C("Priyanka Das", "+91 97481 63390"), address: ADDRESSES.newTown, base: 149, discount: 50, couponCode: "FIXONEST50" }),
    make(now, { id: "FXN-6WQ1BN", status: "pending", dayOffset: 1, startHour: 9, receivedMinutesAgo: 140, provider: P.sunita, service: S.bathroom, customer: C("Soumya Dutta", "+91 98369 70014"), address: ADDRESSES.gariahat, base: 599 }),

    // Upcoming
    make(now, { id: "FXN-7RK5YC", status: "accepted", dayOffset: soon.dayOffset, startHour: Math.min(soon.startHour + 2, 20), provider: P.asha, service: S.switch, customer: C("Sourav Banerjee", "+91 98302 77105"), address: ADDRESSES.behala, base: 249 }),
    make(now, { id: "FXN-5TN3QB", status: "accepted", bookingType: "worker", dayOffset: 1, startHour: 10, hours: 3, provider: P.yash, service: S.wiring, customer: C("Megha Agarwal", "+91 98741 20556"), address: ADDRESSES.gariahat, base: 1047, discount: 100, couponCode: "FIRST10" }),
    make(now, { id: "FXN-8PW2MJ", status: "accepted", dayOffset: 4, startHour: 17, provider: P.imran, service: S.geyser, customer: C("Kunal Mehta", "+91 90510 88123"), address: ADDRESSES.parkStreet, base: 399 }),
    make(now, { id: "FXN-1ZR9KC", status: "accepted", dayOffset: 6, startHour: 12, hours: 4, provider: P.rakesh, service: S.paint, customer: C("Rupa Halder", "+91 90880 31752"), address: ADDRESSES.dumdum, base: 2499 }),

    // In progress
    make(now, { id: "FXN-3VC6HE", status: "in_progress", dayOffset: 0, startHour: ongoingHour, hours: 2, provider: P.sunita, service: S.kitchen, customer: C("Anjali Roy", "+91 98364 51207"), address: ADDRESSES.dumdum, base: 1299, instructions: "Focus on the chimney and the tiles behind the stove." }),
    make(now, { id: "FXN-0DX4PL", status: "in_progress", dayOffset: 0, startHour: Math.max(ongoingHour - 1, 8), provider: P.ravi, service: S.drain, customer: C("Tapas Saha", "+91 97483 50921"), address: ADDRESSES.behala, base: 349 }),

    // Awaiting cash
    make(now, { id: "FXN-6YB9RT", status: "completed", dayOffset: 0, startHour: Math.max(ongoingHour - 3, 8), provider: P.imran, service: S.washer, customer: C("Debasish Paul", "+91 97482 30961"), address: ADDRESSES.behala, base: 449 }),
    make(now, { id: "FXN-1HG4WA", status: "completed", dayOffset: -1, startHour: 16, hours: 2, bookingType: "worker", provider: P.asha, service: S.fan, customer: C("Sneha Chatterjee", "+91 90381 77452"), address: ADDRESSES.newTown, base: 698 }),

    // Paid
    make(now, { id: "FXN-4LX7NP", status: "paid", dayOffset: -2, startHour: 11, provider: P.imran, service: S.ac, customer: C("Rahul Verma", "+91 98306 14420"), address: ADDRESSES.saltLake, base: 499 }),
    make(now, { id: "FXN-9QE2DK", status: "paid", dayOffset: -4, startHour: 9, hours: 2, provider: P.pooja, service: S.bathroom, customer: C("Tanya Kapoor", "+91 97480 55319"), address: ADDRESSES.gariahat, base: 599, discount: 59, couponCode: "FIRST10" }),
    make(now, { id: "FXN-2MR5JU", status: "paid", dayOffset: -7, startHour: 14, bookingType: "worker", hours: 3, provider: P.yash, service: S.wiring, customer: C("Abhishek Sinha", "+91 98318 90044"), address: ADDRESSES.parkStreet, base: 1047 }),
    make(now, { id: "FXN-7GT8ZS", status: "paid", dayOffset: -12, startHour: 12, provider: P.ravi, service: S.tap, customer: C("Nandini Bose", "+91 90073 61285"), address: ADDRESSES.dumdum, base: 149 }),
    make(now, { id: "FXN-3HS6VE", status: "paid", dayOffset: -9, startHour: 15, provider: P.sunita, service: S.sofa, customer: C("Arpita Basu", "+91 98303 44871"), address: ADDRESSES.newTown, base: 799 }),
    make(now, { id: "FXN-8LB2QT", status: "paid", dayOffset: -16, startHour: 10, hours: 4, provider: P.rakesh, service: S.paint, customer: C("Sudip Roy", "+91 90079 21436"), address: ADDRESSES.ballygunge, base: 2499, discount: 100, couponCode: "FIRST10" }),
    make(now, { id: "FXN-6RT2KW", status: "paid", dayOffset: -1, startHour: 12, provider: P.sunita, service: S.kitchen, customer: C("Debolina Sen", "+91 98307 41286"), address: ADDRESSES.saltLake, base: 1299 }),
    make(now, { id: "FXN-9AQ5HM", status: "paid", dayOffset: -5, startHour: 10, provider: P.ravi, service: S.drain, customer: C("Arnab Paul", "+91 90073 81547"), address: ADDRESSES.gariahat, base: 349 }),
    make(now, { id: "FXN-3EZ8NB", status: "paid", dayOffset: -14, startHour: 17, provider: P.yash, service: S.switch, customer: C("Lopamudra Das", "+91 97483 26690"), address: ADDRESSES.behala, base: 249 }),
    make(now, { id: "FXN-7WS1CJ", status: "paid", dayOffset: -19, startHour: 11, provider: P.imran, service: S.geyser, customer: C("Subhro Nag", "+91 98742 90315"), address: ADDRESSES.parkStreet, base: 399 }),
    make(now, { id: "FXN-2HL6VT", status: "paid", dayOffset: -24, startHour: 14, hours: 2, provider: P.pooja, service: S.kitchen, customer: C("Rimjhim Saha", "+91 90381 52479"), address: ADDRESSES.dumdum, base: 1299 }),
    make(now, { id: "FXN-8NF3GU", status: "paid", dayOffset: -29, startHour: 9, provider: P.asha, service: S.wiring, customer: C("Bodhisattva Roy", "+91 98306 13308"), address: ADDRESSES.newTown, base: 349 }),
    make(now, { id: "FXN-5CW1PF", status: "paid", dayOffset: -35, startHour: 10, provider: P.imran, service: { name: "Water Purifier Service", category: "Appliance repair" }, customer: C("Vikram Singh", "+91 98311 42678"), address: ADDRESSES.ballygunge, base: 349 }),

    // Rejected - need a new provider
    make(now, { id: "FXN-8BK3VL", status: "rejected", dayOffset: 2, startHour: 19, provider: P.pooja, service: S.sofa, customer: C("Ishita Mukherjee", "+91 97483 11760"), address: ADDRESSES.newTown, base: 799, rejectionReason: "Fully booked that day" }),
    make(now, { id: "FXN-4JN7RA", status: "rejected", dayOffset: 3, startHour: 8, provider: P.asha, service: S.switch, customer: C("Pritam Saha", "+91 98742 66309"), address: ADDRESSES.dumdum, base: 249, rejectionReason: "Location is too far", rejectedEarlierBy: [{ provider: P.yash, reason: "Not available at this time" }] }),

    // Cancelled
    make(now, { id: "FXN-3NJ6TQ", status: "cancelled", dayOffset: -5, startHour: 13, wasAccepted: true, provider: P.asha, service: { name: "Ceiling Fan Repair", category: "Electrical" }, customer: C("Manish Jha", "+91 98307 25591"), address: ADDRESSES.behala, base: 199, cancellationReason: "Plans changed" }),

    // ---- Beauty & Wellness (Super Admin only in the demo) ----
    make(now, { id: "FXN-6BW2HN", status: "pending", dayOffset: 1, startHour: 11, receivedMinutesAgo: 30, provider: P.neha, service: S.facial, customer: C("Shreya Ghoshal", "+91 98300 51269"), address: ADDRESSES.gariahat, base: 899 }),
    make(now, { id: "FXN-2BR8MJ", status: "accepted", dayOffset: 5, startHour: 7, hours: 3, provider: P.neha, service: S.bridal, customer: C("Payel Sarkar", "+91 90073 40981"), address: ADDRESSES.newTown, base: 7999, discount: 100, couponCode: "FIRST10" }),
    make(now, { id: "FXN-9HC4TS", status: "in_progress", dayOffset: 0, startHour: ongoingHour, provider: P.ritu, service: S.haircut, customer: C("Moumita Dey", "+91 97482 61135"), address: ADDRESSES.ballygunge, base: 599 }),
    make(now, { id: "FXN-4MS7QA", status: "paid", dayOffset: -3, startHour: 18, provider: P.arjun, service: S.massage, customer: C("Rohit Bansal", "+91 98318 24407"), address: ADDRESSES.parkStreet, base: 1299 }),
    make(now, { id: "FXN-7FC1LE", status: "paid", dayOffset: -10, startHour: 16, provider: P.ritu, service: S.facial, customer: C("Sohini Mitra", "+91 90381 90316"), address: ADDRESSES.saltLake, base: 899 }),
    make(now, { id: "FXN-1RJ5BW", status: "rejected", dayOffset: 2, startHour: 20, provider: P.arjun, service: S.massage, customer: C("Kabir Sethi", "+91 98742 18855"), address: ADDRESSES.dumdum, base: 1299, rejectionReason: "Not available at this time" }),

    // ---- Pest Control (Super Admin only in the demo) ----
    make(now, { id: "FXN-5PC3RK", status: "pending", dayOffset: 2, startHour: 10, hours: 2, receivedMinutesAgo: 70, provider: P.sanjay, service: S.general, customer: C("Amitava Ghosh", "+91 98306 70452"), address: ADDRESSES.behala, base: 1499 }),
    make(now, { id: "FXN-8CK6DF", status: "completed", dayOffset: -1, startHour: 12, provider: P.sanjay, service: S.cockroach, customer: C("Swati Jain", "+91 90510 33874"), address: ADDRESSES.newTown, base: 799 }),
    make(now, { id: "FXN-3TT9GP", status: "paid", dayOffset: -6, startHour: 9, hours: 3, provider: P.bikash, service: S.termite, customer: C("Partha Chakraborty", "+91 97483 12088"), address: ADDRESSES.gariahat, base: 3499 }),
    make(now, { id: "FXN-0GP2VX", status: "cancelled", dayOffset: -2, startHour: 15, provider: P.bikash, service: S.general, customer: C("Indrani Lahiri", "+91 98364 98021"), address: ADDRESSES.saltLake, base: 1499, cancellationReason: "Booked by mistake" }),
  ];
};
