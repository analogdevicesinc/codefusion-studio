/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * Telemetry action names used throughout the extension.
 */
export const TELEMETRY_ACTIONS = {
  TELEMETRY_CONSENT_GIVEN: "telemetry_consent_given",
  EXTENSION_ACTIVATED: "extension_activated",
  ACTIVATION_SETTINGS: "activation_settings",
  WORKSPACE_OPENED: "workspace_opened",
  EXTENSION_DEACTIVATED: "extension_deactivated",
  WORKSPACE_CREATE_SUCCESS: "workspace_create_success",
  WORKSPACE_CREATE_FAILURE: "workspace_create_failure",
  SIDEBAR_ITEM_CLICKED: "sidebar_item_clicked",
  BUILD_FW_SUCCESS: "build_fw_success",
  BUILD_FW_FAILURE: "build_fw_failure",
  FLASH_FW_SUCCESS: "flash_fw_success",
  FLASH_FW_FAILURE: "flash_fw_failure",
  AI_MODEL_CHECK_SUCCESS: "ai_model_check_success",
  AI_MODEL_CHECK_FAILURE: "ai_model_check_failure",
  TRACE_CAPTURE_STARTED: "trace_capture_started",
  DEBUG_FW_STARTED: "debug_fw_started",
  OZONE_LAUNCHED: "ozone_launched",
  CONFIG_TOOLS_OPENED: "config_tools_opened",
  FEATURE_ACCESSED: "feature_accessed",
  CONFIG_TOOLS_SCREEN_NAVIGATED: "config_tools_screen_navigated",
  CONFIG_TOOLS_INTERACTION: "config_tools_interaction",
  PERIPHERAL_ALLOCATED: "peripheral_allocated",
  PERIPHERAL_DEALLOCATED: "peripheral_deallocated",
  PERIPHERAL_CONFIGURED: "peripheral_configured",
  PIN_SIGNAL_ASSIGNED: "pin_signal_assigned",
  PIN_SIGNAL_REMOVED: "pin_signal_removed",
  PIN_CONTROL_CONFIGURED: "pin_control_configured",
  CLOCK_NODE_CONFIGURED: "clock_node_configured",
  CLOCK_VALIDATION_ERROR: "clock_validation_error",
  MEMORY_PARTITION_CREATED: "memory_partition_created",
  MEMORY_PARTITION_MODIFIED: "memory_partition_modified",
  MEMORY_PARTITION_DELETED: "memory_partition_deleted",
  CODE_GENERATED: "code_generated",
  CODE_GENERATION_FAILED: "code_generation_failed",
  AI_COMPAT_CHECK_STARTED: "ai_compat_check_started",
  AI_COMPAT_REPORT_OPEN: "ai_compat_report_open",
  HW_PROFILING_STARTED: "hw_profiling_started",
  HW_PROFILING_COMPLETED: "hw_profiling_completed",
  HW_PROFILING_FAILED: "hw_profiling_failed",
  AI_PROFILING_REPORT_OPEN: "ai_profiling_report_open",
  AI_CODE_GENERATED: "ai_code_generated",
  AI_CODE_GENERATION_FAILED: "ai_code_generation_failed",
  AI_HW_DEPLOY_STARTED: "ai_hw_deploy_started",
  AI_HW_DEPLOY_RUNNING: "ai_hw_deploy_running",
  AI_HW_DEPLOY_STOPPED: "ai_hw_deploy_stopped",
  AI_HW_DEPLOY_FAILED: "ai_hw_deploy_failed",
  BUILD_FW_STARTED: "build_fw_started",
  BUILD_ALL_STARTED: "build_all_started",
  FLASH_FW_STARTED: "flash_fw_started",
  DFG_STREAM_CREATED: "dfg_stream_created",
  DFG_STREAM_DELETED: "dfg_stream_deleted",
  GDB_TOOLBOX_USED: "gdb_toolbox_used",
  MCP_SERVER_STARTED: "mcp_server_started",
  SEV_FILE_SAVED: "sev_file_saved",
  SEV_SUPPORTED: "sev_supported",
  SEV_EVENT_ENABLED: "sev_event_enabled",
  SEV_EVENT_DISABLED: "sev_event_disabled",
  SEV_FILE_STATISTICS: "sev_file_statistics",
  SEV_READ_EVENTS: "sev_read_events",
  SRU_INPUT_CONNECTION_MODIFIED: "sru_input_connection_modified",
  SRU_OUTPUT_CONNECTION_MODIFIED: "sru_output_connection_modified",
  SRU_PIN_BUFFER_INPUT_SIGNAL_MODIFIED: "sru_pin_buffer_input_signal_modified",
  SRU_PIN_BUFFER_OUTPUT_SIGNAL_MODIFIED:
    "sru_pin_buffer_output_signal_modified",
  SRU_PIN_BUFFER_DIRECTION_MODIFIED: "sru_pin_buffer_direction_modified",
  SRU_RESET_SOURCE: "sru_reset_source",
  APP_PACK_CREATED: "app_pack_created",
  APP_PACK_DELETED: "app_pack_deleted",
  IMAGE_ADDED: "image_added",
  CUSTOM_TLV_ADDED: "custom_tlv_added",
  COMPONENT_DELETED: "component_deleted",
  SIGN_KEY_SELECTED: "sign_key_selected",
  FIREWALL_ZONE_CREATED: "firewall_zone_created",
  ACCESS_MODES_CONFIGURED: "access_modes_configured",
  INITIATOR_ADDED: "initiator_added",
  INITIATOR_REMOVED: "initiator_removed",
  RESPONDER_ADDED: "responder_added",
  RESPONDER_REMOVED: "responder_removed",
  MODEL_ADDED: "model_added",
  WORKSPACE_CREATED_FROM_MODEL: "workspace_created_from_model",
};
