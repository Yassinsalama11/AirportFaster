import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ManageBookingClient } from '@/components/public/booking/ManageBookingClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('manage');
  return { title: t('meta_title'), description: t('meta_description') };
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; token?: string }>;
}) {
  const params = await searchParams;

  // Backwards-compat: if a token shows up (from old email links), keep using
  // the token-based detail page.
  if (params.token) {
    redirect(`/manage/${encodeURIComponent(params.token)}`);
  }

  const t = await getTranslations('manage');

  return (
    <ManageBookingClient
      labels={{
        title: t('title'),
        subtitle: t('subtitle'),
        refLabel: t('ref_label'),
        refPlaceholder: t('ref_placeholder'),
        emailLabel: t('email_label'),
        emailPlaceholder: t('email_placeholder'),
        lookupBtn: t('lookup_btn'),
        lookupLoading: t('lookup_loading'),
        needHelp: t('need_help'),
        tabOverview: t('tab_overview'),
        tabEdit: t('tab_edit'),
        tabCancel: t('tab_cancel'),
        tabComplaint: t('tab_complaint'),
        airport: t('airport'),
        service: t('service'),
        whenLabel: t('when'),
        paid: t('paid'),
        supplier: t('supplier'),
        passengersTitle: t('passengers_title'),
        contactTitle: t('contact_title'),
        nameLabel: t('name_label'),
        phoneLabel: t('phone_label'),
        editTitle: t('edit_title'),
        editDateLabel: t('edit_date_label'),
        editPaxTitle: t('edit_pax_title'),
        editSaveBtn: t('edit_save_btn'),
        editSavingBtn: t('edit_saving_btn'),
        editSavedMsg: t('edit_saved_msg'),
        cancelTitle: t('cancel_title'),
        cancelBody: t('cancel_body'),
        cancelReasonLabel: t('cancel_reason_label'),
        cancelReasonPlaceholder: t('cancel_reason_placeholder'),
        cancelConfirmBtn: t('cancel_confirm_btn'),
        cancelLoadingBtn: t('cancel_loading_btn'),
        cancelWithin24: t('cancel_within_24'),
        cancelSuccess: t('cancel_success'),
        complaintTitle: t('complaint_title'),
        complaintBody: t('complaint_body'),
        complaintCategoryLabel: t('complaint_category_label'),
        complaintCategoryServiceQuality: t('complaint_cat_service_quality'),
        complaintCategoryNoShow: t('complaint_cat_no_show'),
        complaintCategoryWrongTerminal: t('complaint_cat_wrong_terminal'),
        complaintCategoryCommunication: t('complaint_cat_communication'),
        complaintCategoryOther: t('complaint_cat_other'),
        complaintMessageLabel: t('complaint_message_label'),
        complaintMessagePlaceholder: t('complaint_message_placeholder'),
        complaintSubmitBtn: t('complaint_submit_btn'),
        complaintLoadingBtn: t('complaint_loading_btn'),
        complaintSuccess: t('complaint_success'),
        errorGeneric: t('error_generic'),
        backToBooking: t('back_to_booking'),
        startOver: t('start_over'),
      }}
    />
  );
}
