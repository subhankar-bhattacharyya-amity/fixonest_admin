import { PLATFORM_COMMISSION_RATE, formatHour } from './providerBookings.js';

/**
 * Normalizes any booking object (backend Mongoose document or frontend mock shape)
 * into a single unified data shape expected by Admin and Provider views.
 */
export function normalizeBooking(doc) {
  if (!doc) return null;

  // If already normalized frontend shape
  if (
    doc.service &&
    doc.customer &&
    doc.pricing &&
    typeof doc.service === 'object' &&
    doc.pricing.total !== undefined &&
    doc.customer.address
  ) {
    const rawStatus = doc.status === 'accepted' ? 'upcoming' : doc.status;
    const resolvedId = String(doc.id || doc._id || doc.bookingNumber || '');
    let resolvedNumber = doc.bookingNumber;
    if (!resolvedNumber || /^[0-9a-fA-F]{24}$/.test(String(resolvedNumber))) {
      if (doc.id && !/^[0-9a-fA-F]{24}$/.test(String(doc.id))) {
        resolvedNumber = String(doc.id);
      } else if (resolvedId && resolvedId.length >= 6) {
        resolvedNumber = `FN-BK-${resolvedId.slice(-6).toUpperCase()}`;
      }
    }
    const finalNumber = resolvedNumber && !/^[0-9a-fA-F]{24}$/.test(String(resolvedNumber))
      ? String(resolvedNumber)
      : (resolvedId.length >= 6 ? `FN-BK-${resolvedId.slice(-6).toUpperCase()}` : resolvedId);

    let startHour = typeof doc.startHour === 'number' ? doc.startHour : 10;
    let endHour = typeof doc.endHour === 'number' ? doc.endHour : 11;
    if (doc.startTime && typeof doc.startTime === 'string' && doc.startTime.includes(':')) {
      const parts = doc.startTime.split(':');
      startHour = (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
    }
    if (doc.endTime && typeof doc.endTime === 'string' && doc.endTime.includes(':')) {
      const parts = doc.endTime.split(':');
      endHour = (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
    }

    const scheduledDate = doc.scheduledDate || doc.bookingDate || doc.date || new Date().toISOString().slice(0, 10);

    return {
      ...doc,
      id: resolvedId,
      bookingNumber: finalNumber,
      status: rawStatus,
      startHour,
      endHour,
      startTime: doc.startTime || null,
      endTime: doc.endTime || null,
      scheduledDate,
      bookingDate: scheduledDate,
    };
  }

  const id = doc._id ? String(doc._id) : String(doc.id || doc.bookingNumber || '');
  let bookingNumber = doc.bookingNumber;
  if (!bookingNumber || /^[0-9a-fA-F]{24}$/.test(String(bookingNumber))) {
    if (doc.id && !/^[0-9a-fA-F]{24}$/.test(String(doc.id))) {
      bookingNumber = String(doc.id);
    } else if (id) {
      bookingNumber = `FN-BK-${id.slice(-6).toUpperCase()}`;
    }
  }
  const rawStatus = String(doc.status || 'pending').toLowerCase();
  // Normalize accepted -> upcoming for internal consistency, while UI recognizes both
  const status = rawStatus === 'accepted' ? 'upcoming' : rawStatus;

  const customerObj = typeof doc.customer_id === 'object' && doc.customer_id !== null ? doc.customer_id : {};
  const providerObj = typeof doc.provider_id === 'object' && doc.provider_id !== null ? doc.provider_id : {};
  const serviceObj = typeof doc.service_id === 'object' && doc.service_id !== null ? doc.service_id : {};
  const categoryObj = typeof serviceObj.categoryId === 'object' && serviceObj.categoryId !== null ? serviceObj.categoryId : {};
  const verticalObj = typeof categoryObj.vertical_id === 'object' && categoryObj.vertical_id !== null ? categoryObj.vertical_id : {};

  // Timing: parse 24h string HH:mm into float hours (e.g. 16:30 -> 16.5) so minutes are never lost
  let startHour = 10;
  let endHour = 11;
  const startTime = doc.startTime || null;
  const endTime = doc.endTime || null;
  if (doc.startTime && typeof doc.startTime === 'string') {
    const parts = doc.startTime.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    startHour = h + m / 60;
  } else if (typeof doc.startHour === 'number') {
    startHour = doc.startHour;
  }
  if (doc.endTime && typeof doc.endTime === 'string') {
    const parts = doc.endTime.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    endHour = h + m / 60;
  } else if (typeof doc.endHour === 'number') {
    endHour = doc.endHour;
  }
  const hours = Math.max(endHour - startHour, 1);
  const scheduledDate = doc.bookingDate || doc.scheduledDate || doc.date || new Date().toISOString().slice(0, 10);
  const timeSlot = doc.timeSlot || (startTime && endTime ? `${startTime} – ${endTime}` : `${formatHour(startHour)} – ${formatHour(endHour)}`);

  // Address
  const rawAddr = doc.customerAddress || doc.address || {};
  const address = {
    label: rawAddr.landmark ? `Near ${rawAddr.landmark}` : (rawAddr.label || 'Home'),
    line: rawAddr.street || rawAddr.line || 'Customer Address',
    area: rawAddr.city || rawAddr.area || 'Kolkata',
    landmark: rawAddr.landmark || '',
    city: rawAddr.city || 'Kolkata',
    state: rawAddr.state || 'West Bengal',
    pincode: rawAddr.postalCode || rawAddr.pincode || '',
  };

  // Customer
  const customer = {
    id: customerObj._id ? String(customerObj._id) : (doc.customer?.id || 'customer'),
    name: customerObj.fullName || doc.customer?.name || 'Customer',
    phone: doc.customerPhone || customerObj.phone || doc.customer?.phone || '',
    email: doc.customerEmail || customerObj.email || doc.customer?.email || '',
    avatar: customerObj.profile_image || doc.customer?.avatar || null,
    address,
    note: doc.customerNotes || doc.instructions || '',
  };

  // Provider
  const provider = {
    id: providerObj._id ? String(providerObj._id) : (doc.provider?.id || (doc.provider_id ? String(doc.provider_id) : 'provider')),
    name: providerObj.fullName || doc.provider?.name || 'Assigned Provider',
    phone: providerObj.phone || doc.provider?.phone || '',
    avatar: providerObj.profile_image || doc.provider?.avatar || null,
    category: categoryObj.name || doc.provider?.category || 'Service Partner',
    rating: typeof doc.provider?.rating === 'number' ? doc.provider.rating : 4.8,
    jobsDone: typeof doc.provider?.jobsDone === 'number' ? doc.provider.jobsDone : 120,
    vertical: {
      id: verticalObj._id ? String(verticalObj._id) : (doc.vertical?.id || 'vertical'),
      name: verticalObj.display_name || verticalObj.name || doc.vertical?.name || 'Home Services',
    },
  };

  // Service
  const service = {
    id: serviceObj._id ? String(serviceObj._id) : (doc.service?.id || 'service'),
    name: serviceObj.name || doc.service?.name || 'Service Booking',
    category: categoryObj.name || doc.service?.category || provider.category || 'General',
    duration: serviceObj.durationInMinutes || doc.service?.duration || (hours * 60),
    image: serviceObj.image_url || doc.service?.image || null,
    bookingType: doc.bookingType || 'service',
  };

  // Financials
  const basePrice = Number(doc.price || doc.pricing?.base || serviceObj.price || 0);
  const total = Number(doc.finalAmount || doc.pricing?.total || basePrice);

  let discount = 0;
  if (doc.discountAmount !== undefined && Number(doc.discountAmount) > 0) {
    discount = Number(doc.discountAmount);
  } else if (doc.discountPrice !== undefined && Number(doc.discountPrice) > 0 && Number(doc.discountPrice) < basePrice) {
    // In backend service/booking model, discountPrice is the discounted offer price (e.g. 349 when base is 449).
    // The discount amount given to customer is basePrice - discountPrice (449 - 349 = 100).
    discount = basePrice - Number(doc.discountPrice);
  } else if (basePrice > total) {
    discount = basePrice - total;
  } else if (doc.pricing?.discount !== undefined && Number(doc.pricing.discount) > 0) {
    discount = Number(doc.pricing.discount);
  }

  // Convenience fee: only if explicitly specified, otherwise 0
  const convenienceFee = doc.pricing?.convenienceFee !== undefined
    ? Number(doc.pricing.convenienceFee)
    : (doc.convenienceFee !== undefined ? Number(doc.convenienceFee) : 0);

  // Platform commission & provider earnings
  const commissionRate = doc.commissionRate !== undefined
    ? Number(doc.commissionRate)
    : Math.round(PLATFORM_COMMISSION_RATE * 100);
  const commission = doc.commissionAmount !== undefined
    ? Number(doc.commissionAmount)
    : Math.round(total * (commissionRate / 100));
  const earning = doc.providerAmount !== undefined
    ? Number(doc.providerAmount)
    : (total - commission);

  const pricing = {
    base: basePrice,
    visitingCharge: 0,
    convenienceFee,
    discount,
    couponCode: doc.couponCode || null,
    total,
    commissionRate,
    commission,
    earning,
  };

  // Payment
  const isPaid = doc.paymentStatus === 'paid' || status === 'paid' || (Number(doc.paidAmount) > 0 && Number(doc.paidAmount) >= total);
  const paymentStatus = isPaid ? 'paid' : (doc.paymentStatus || 'unpaid');
  const paymentMethod = doc.paymentMethod || 'cash';
  const paidAmount = Number(doc.paidAmount !== undefined && doc.paidAmount !== null ? doc.paidAmount : (isPaid ? total : 0));
  const cashPayment = isPaid || paidAmount > 0 ? {
    amountReceived: paidAmount || total,
    receivedAt: doc.completedAt || doc.updatedAt || new Date().toISOString(),
    note: doc.customerNotes || null,
  } : (doc.cashPayment || null);

  // Dynamic Activity Trail
  let activity = Array.isArray(doc.activity) && doc.activity.length > 0 ? [...doc.activity] : [];
  if (activity.length === 0) {
    const createdAt = doc.createdAt || new Date().toISOString();
    activity.push({
      status: 'pending',
      note: `Booking request created for ${service.name}`,
      actor: 'system',
      at: createdAt,
    });
    if (doc.acceptedAt || status === 'upcoming' || status === 'accepted') {
      activity.push({
        status: 'upcoming',
        note: `${provider.name} accepted the booking`,
        actor: 'provider',
        at: doc.acceptedAt || createdAt,
      });
    }
    if (status === 'in_progress') {
      activity.push({
        status: 'in_progress',
        note: `${provider.name} started the job`,
        actor: 'provider',
        at: doc.updatedAt || createdAt,
      });
    }
    if (doc.completedAt || status === 'completed') {
      activity.push({
        status: 'completed',
        note: `${provider.name} marked the job as completed`,
        actor: 'provider',
        at: doc.completedAt || doc.updatedAt || createdAt,
      });
    }
    if (isPaid) {
      activity.push({
        status: 'paid',
        note: `₹${total.toLocaleString('en-IN')} cash payment received`,
        actor: 'provider',
        at: doc.completedAt || doc.updatedAt || createdAt,
      });
    }
    if (doc.rejectedAt || status === 'rejected') {
      activity.push({
        status: 'rejected',
        note: `${provider.name} rejected the booking${doc.rejectionReason ? `: ${doc.rejectionReason}` : ''}`,
        actor: 'provider',
        at: doc.rejectedAt || doc.updatedAt || createdAt,
      });
    }
    if (doc.cancelledAt || status === 'cancelled') {
      activity.push({
        status: 'cancelled',
        note: `Booking cancelled${doc.cancellationReason ? `: ${doc.cancellationReason}` : ''}`,
        actor: 'admin',
        at: doc.cancelledAt || doc.updatedAt || createdAt,
      });
    }
  }

  const createdAt = doc.createdAt || new Date().toISOString();
  const expiresAt = status === 'pending'
    ? (doc.expiresAt || new Date(new Date(createdAt).getTime() + 2 * 3600000).toISOString())
    : null;

  return {
    id,
    bookingNumber,
    bookingType: service.bookingType,
    service,
    customer,
    provider,
    vertical: provider.vertical,
    address,
    scheduledDate,
    bookingDate: scheduledDate,
    startTime,
    endTime,
    startHour,
    endHour,
    hours,
    timeSlot,
    instructions: doc.customerNotes || doc.instructions || '',
    pricing,
    commissionRate,
    commissionAmount: commission,
    providerAmount: earning,
    status,
    paymentStatus,
    paymentMethod,
    paidAmount,
    isPaid,
    cashPayment,
    rejectionReason: doc.rejectionReason || null,
    cancellationReason: doc.cancellationReason || null,
    acceptedAt: doc.acceptedAt || null,
    startedAt: doc.startedAt || null,
    completedAt: doc.completedAt || null,
    expiresAt,
    activity,
    createdAt,
  };
}

