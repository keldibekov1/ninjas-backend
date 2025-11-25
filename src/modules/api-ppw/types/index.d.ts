export type LineItem = {
  desc: string;
  qty: number;
  price: number;
  total: number;
  add: string;
};

export type KeyValue = {
  mcs_woid: string;
  bg_checkin_provider: string;
  autoimport_client_orig: string;
  wo_number_orig: string;
  wo_photo_ts_format: string;
  autoimport_userid: string;
};

export type OrderDetails = {
  client_company_alias: string;
  cust_text: string;
  loan_number: string;
  loan_type_other: string;
  date_received: string;
  date_due: string;
  start_date: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  comments: string;
  work_type_alias: string;
  mortgage_name: string;
  line_items: LineItem[];
  pcr_forms: any[];
  ppw_report_id: number;
  import_user_id: string | null;
  key_values: KeyValue;
  lot_size: string;
  lock_code: string;
  key_code: string;
  broker_name: string;
  broker_company: string;
  broker_phone: string;
  broker_email: string;
  wo_status: string;
  has_foh: boolean;
  coordinates: string;
};

export type PrimaryOrdersListType = {
  remote_site_id: string;
  success: boolean;
  return_error_msg: string | null;
  result_data: {
    report_id: number;
    wo_number: string;
    org_wo_num: number;
    wo_status: string;
    isVisible?: boolean;
    details?: OrderDetails;
  }[];
  remote_org_id: number;
  error: boolean;
};

export type SingleOrderType = {
  remote_site_id: string;
  success: boolean;
  return_error_msg: string | null;
  isVisible?: boolean;
  result_data: OrderDetails;
  remote_org_id: number;
  error: boolean;
};

export type IntegratedOrdersListType = {
  msg: string;
  dataFetchType: 'API' | 'CACHE';
  remote_site_id: string;
  success: boolean;
  return_error_msg: string | null;
  result_data: {
    report_id: number;
    wo_number: string;
    org_wo_num: number;
    wo_status: string;
    details: OrderDetails;
  }[];
  remote_org_id: number;
  error: boolean;
};
