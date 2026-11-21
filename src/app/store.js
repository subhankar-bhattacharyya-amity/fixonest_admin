import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/features/auth/index.js";
import { verticalReducer } from "@/features/vertical/index.js";
import { verticalAdminReducer } from "@/features/verticalAdmin/index.js";
import { providerReducer } from "@/features/provider/index.js";
import { customerReducer } from "@/features/customer/index.js";
import { serviceCategoryReducer } from "@/features/serviceCategory/index.js";
import { blogCategoryReducer } from "@/features/blogCategory/index.js";
import { blogReducer } from "@/features/blog/index.js";
import { serviceReducer } from "@/features/service/index.js";
import { serviceReviewReducer } from "@/features/serviceReview/index.js";
import { faqReducer } from "@/features/faq/index.js";
import { testimonialReducer } from "@/features/testimonial/index.js";
import { providerAssignmentReducer } from "@/features/providerAssignment/index.js";
import { teamMemberReducer } from "@/features/teamMember/index.js";
import { contactReducer } from "@/features/contact/index.js";
import { dashboardReducer } from "@/features/dashboard/index.js";
import { providerProfileReducer } from "@/features/providerProfile/index.js";
import { workingHoursReducer } from "@/features/workingHours/index.js";
import { providerBookingReducer } from "@/features/providerBooking/index.js";
import { adminBookingReducer } from "@/features/adminBooking/index.js";
import { providerAvailabilityReducer } from "@/features/providerAvailability/index.js";

// Combines every feature's own slice (see features/<name>/store/*Slice.js).
// Add a new feature's reducer here once its slice exists - never move a
// slice's logic into this file itself.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    vertical: verticalReducer,
    verticalAdmin: verticalAdminReducer,
    provider: providerReducer,
    customer: customerReducer,
    serviceCategory: serviceCategoryReducer,
    blogCategory: blogCategoryReducer,
    blog: blogReducer,
    service: serviceReducer,
    serviceReview: serviceReviewReducer,
    faq: faqReducer,
    testimonial: testimonialReducer,
    providerAssignment: providerAssignmentReducer,
    teamMember: teamMemberReducer,
    contact: contactReducer,
    dashboard: dashboardReducer,
    providerProfile: providerProfileReducer,
    workingHours: workingHoursReducer,
    providerBooking: providerBookingReducer,
    adminBooking: adminBookingReducer,
    providerAvailability: providerAvailabilityReducer,
  },
});
