# Copyright (c) 2025 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from dataclasses import asdict, dataclass
from typing import Any

_nested_keys_to_remove = [
    "Config",
    "Datamodels",
    "Project.$defs.ConfigBackend",
    "Project.$defs.ConfigTargetExplicit",
    "Project.$defs.ModelConfig",
    "Project.$defs.FileInfo",
    "Project.properties.AIEnabled",
    "Project.properties.AIModels",
    "Project.properties.CoreId",
    "Project.properties.FirmwarePlatform",
    "Project.properties.PlatformConfig",
    "SupportedBackends.izer.Extensions.properties.CompactData",
    "SupportedBackends.izer.Extensions.properties.Pipeline",
    "SupportedBackends.izer.Extensions.properties.Pll"
]

_single_keys_to_remove = [
    "Accelerators",
    "anyOf",
    "default",
    "description",
    "ExecutionMode",
    "ExecutionModes",
    "FirmwarePlatforms",
    "Kind",
    "required",
    "Runtime",
    "Runtimes",
    "title",
    "type",
    "$ref"
]

_single_layers_to_remove = [
     "properties",
     "Project",
     "$defs"
]

_max_models = { 
  "izer": 1,
  "neuroweave": 4
}

_advanced_tools = {
  "tflm" : True
}
   

@dataclass
class _ControlEnum:
   Id: str
   Value: str
   Description: str

@dataclass
class _Control:
   Id: str
   Type: str
   Description: str
   Tooltip: str
   Default: str | bool | None = None
   EnumValues: list[_ControlEnum] | None = None

_timer_enum: list[_ControlEnum] = [
   _ControlEnum('0','0','0'),
   _ControlEnum('1','1','1'),
   _ControlEnum('2','2','2'),
   _ControlEnum('3','3','3')
]
_clock_divider_enum: list[_ControlEnum] = [
   _ControlEnum('1','1','1'),
   _ControlEnum('4','4','4')
]

_controls: list[_Control] = [
   # tflm
   _Control(Id='Section',
           Type='string',
           Description='Memory section for data',
           Tooltip='The memory section used to map the data.'),
   _Control(Id='Symbol',
           Type='string',
           Description='Symbol for data',
           Tooltip='The C symbol used for the data array and generated files.'),
   # Izer
   _Control(Id='AvgPoolRounding',
           Type='boolean',
           Description='Round average pooling results',
           Tooltip='Round the average pooling results.',
           Default=True),
   _Control(Id='ClockDivider',
           Type='enum',
           Description='CNN Clock divider',
           Tooltip='Clock divider for CNN accelerator (1 or 4 depending on source)', 
           Default='1',
           EnumValues=_clock_divider_enum),
   _Control(Id='Fifo',
           Type='boolean',
           Description='Use FIFO',
           Tooltip='Use a FIFO when reading the layer data (useful for larger models)',
           Default=True),
   _Control(Id='InputShape',
           Type='string',
           Description='Input shape',
           Tooltip='Tuple describing the input shape used to generate random '
                   'sample input data e.g. 256,256,256'),
   _Control(Id='NetworkConfig',
           Type='File',
           Description='Network Configuration File',
           Tooltip='Path to the .yaml file describing the network configuration.'),
   _Control(Id='Prefix',
           Type='string',
           Description='Test name prefix',
           Tooltip='The prefix used for the test name'),
   _Control(Id='Softmax',
           Type='boolean',
           Description='Enable softmax layer generation',
           Tooltip='Enable softmax layer generation.',
           Default=True),
   _Control(Id='Timer',
           Type='enum',
           Description='Inference timer',
           Tooltip='Timer [0-3] to use to measure the inference timing.', 
           Default='0',
           EnumValues=_timer_enum)
]

def _get_max_models(key:str) -> int:
    global _max_models
    return _max_models.get(key, 999) # Default to huge value

def _get_slow(key:str) -> bool:
    return False

def _get_advanced_tools(key:str) -> bool:
    return _advanced_tools.get(key, False)

def _get_control(id:str) -> dict | None:
  for control in _controls:
    if control.Id == id:
      return asdict(control)
  
  return None  

def _prune_nested_keys(data: dict) -> None:
  global _nested_keys_to_remove

  for key in _nested_keys_to_remove:
      s = key.split('.')
      layers = len(s)

      try:

          match layers:
              case 1:
                  del data[s[0]]
              case 2:
                  del data[s[0]][s[1]]
              case 3:
                  del data[s[0]][s[1]][s[2]]
              case 4:
                  del data[s[0]][s[1]][s[2]][s[3]]
              case 5:
                  del data[s[0]][s[1]][s[2]][s[3]][s[4]]
              case 6:
                  del data[s[0]][s[1]][s[2]][s[3]][s[4]][s[5]]
              case _:
                  print(f'Unsupported number of keys: {layers}')
      except KeyError:
          print(f'Key: {key} not found. Ignoring')
      
def _prune_single_keys(data: dict | list) -> None:
  global _single_keys_to_remove

  if isinstance(data, dict):
      for key in list(data.keys()):
          if key in _single_keys_to_remove:
              del data[key] 
          else:
              _prune_single_keys(data[key])
  elif isinstance(data, list):
      for item in data:
          _prune_single_keys(item)

def _prune_single_layers(data: Any) -> None:
  global _single_layers_to_remove

  if isinstance(data, dict):
      for key in list(data.keys()): 
          try:
              if key in _single_layers_to_remove:
                  for child_key, child_value in data[key].items():
                        data[child_key] = child_value
                  del data[key] 
                  _prune_single_layers(data)
              else:
                  _prune_single_layers(data.get(key))
          except KeyError:
              pass # Ignore missing key
  elif isinstance(data, list):
      for item in data:
          _prune_single_layers(item)

def _fix_target_names(data: dict) -> None:
    for bev in data['SupportedBackends'].values():
        for t in bev['Targets']:
            if t['Hardware'].get('Family', None) == "CORTEX-M": 
                t['Hardware']['Family'] = "Cortex-M"

def _populate_backends(be:dict, data: dict) -> None:
    data['properties'] = {}
    for key in be:
        if be[key]['Extensions']:
            data['properties'][key] = []
            
            # Remove meta fields
            del be[key]['Extensions']['additionalProperties']
            
            for e in be[key]['Extensions']:
                c = _get_control(e)
                if not c:
                    raise TypeError (f'no control found for {key}:{e}\n{be[key]}')

                # Prune empty fields
                if not c['EnumValues']:
                    del c['EnumValues']
                if not c['Default']:
                    del c['Default']

                data['properties'][key].append(c)

        # Add in metadata for UI
        be[key]['AdvancedTools'] = _get_advanced_tools(key)
        be[key]['MaxModels'] = _get_max_models(key)
        be[key]['Slow'] = _get_slow(key)

        # Remove redundant elements
        del be[key]['Extensions']

        # Remove any duplicate Targets
        seen = set()
        unique = []
        for target in be[key]['Targets']:
            t = tuple(sorted(target['Hardware'].items()))
            if t not in seen:
                seen.add(t)
                if target['FirmwarePlatform']:
                    target['FirmwarePlatform'] = target['FirmwarePlatform'].lower()
                unique.append(target)
        be[key]['Targets'] = unique


def convert_export_to_ui(data: dict) -> dict:
    """
    Convert the export data structure from the representation used by cfsai
    to the structure used by the System Planner in CodeFusion Studio.

    Args:
        data: JSON structure to export

    Raises:
        TypeError: If backend contains a field which doesn't have a
            corresponding _Control entry. 
    """
    _prune_nested_keys(data)
    _prune_single_keys(data)
    _prune_single_layers(data)
    _fix_target_names(data)

    # Add NetworkConfig file as izer extension
    data['SupportedBackends']['izer']['Extensions']['NetworkConfig'] = {}

    # Copy ModelConfig into SupportedBackends
    _populate_backends(data['SupportedBackends'], data)   

    return data
