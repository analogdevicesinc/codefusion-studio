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


from pathlib import Path
import tempfile
from typing import Optional
from functools import cache

from hypothesis import strategies as st
from hypothesis.errors import NoSuchExample

from cfsai.support import support
from cfsai_types.config.targets import MinProjectTarget, BackendTarget
from cfsai_types.config.cfsconfig import CfsConfig, ConfiguredProject
from cfsai_types.config.aiconfig import (
    CacheConfig,  
    ModelConfig, 
    AiConfig,
    FileInfo,
    ConfigTargetExplicit
)

ROOT_PATH = Path(__file__, '..', '..', '..')
EXAMPLES_PATH = ROOT_PATH / 'examples'
TEST_MODEL_PATH = (EXAMPLES_PATH / 
                   'hello_world_f32.tflite').relative_to(Path.cwd())
CACHE_TEMP_DIR = Path(tempfile.gettempdir()).as_posix()

cache_config_strat = st.builds(
    CacheConfig, 
    BaseDir=st.just(CACHE_TEMP_DIR),
)

identifier_strat = st.text(
    alphabet=st.characters(
        codec='utf-8',
        categories=('Lu', 'Ll', 'Nd', 'Pc')
    ),  # Lu=Upper, Ll=Lower, Nd=Digit, Pc=Connector(_)
    min_size=3,
    max_size=30
).filter(
    lambda s: s[0].isalpha() or s[0] == '_'
)

@cache
def gt():
    return support()

@st.composite
def core_target_strat(draw: st.DrawFn, soc: str, core:str, firmware_platform: Optional[str]):
    _dm = gt().datamodels.get(soc)
    if _dm is None:
        raise ValueError(f'{soc} is not a supported soc')
    
    _core = _dm.get_core(core)
    if _core is None:
        raise ValueError(f'{core} is not a supported core on {soc}')
    
    # We have the soc plus core & firmware platform info. Need to find valid
    # accelerator
    target_search_space: list[BackendTarget] = []
    for b in gt().backends.values():
        target_search_space.extend(b.min_prj_targets(
            MinProjectTarget(
                soc=soc,
                core=core,
                family=_core.family,
                firmware_platform=firmware_platform
            )
        ))

    if len(target_search_space) == 0:
        raise NoSuchExample(f'Unable to produce a target for soc={soc}, '\
                            f'core={core}, fw_platform={firmware_platform}')
    
    target = draw(st.sampled_from(target_search_space))

    return ConfigTargetExplicit(
        Core=core,
        Accelerator=target.hardware.accelerator,
        Runtime=target.runtime
    )

@st.composite
def core_ai_strat(draw: st.DrawFn, soc: str):

    return AiConfig(
        CacheConfig=draw(cache_config_strat)
    )

@st.composite
def core_prj_list_strat(draw: st.DrawFn, soc: str):
    _dm = gt().datamodels.get(soc)
    if _dm is None:
        raise ValueError(f'{soc} is not supported')

    base_firmware_platforms = ('msdk', 'zephyr')

    # Find possible firmware platforms for each core
    fw_map: dict[str, set[Optional[str]]] = dict()
    for core in _dm.iter_ai_cores():
        fw_map[core.id] = set()
        fw_lst = [b.supported_firmware_platforms(MinProjectTarget(
            soc=soc,
            core=core.id,
            family= core.family,
            firmware_platform=None
        )) for b in gt().backends.values()]
        for x in fw_lst: 
            fw_map[core.id].update(x)

    # Choose project cores and firmware platforms for those cores
    cores = draw(st.lists(st.sampled_from([c.id for c in _dm.iter_ai_cores()]), min_size=1, max_size=len(_dm.supported_cores()), unique=True))
    fw: list[Optional[str]] = []
    for core_id in cores:
        fw_platforms = list(fw_map[core_id])
        fw_platform = draw(st.sampled_from(fw_platforms))
        if fw_platform is None: # Any platform can be chosen here (within reason)
            fw_platform = draw(st.sampled_from(base_firmware_platforms))
        fw.append(fw_platform)

    names = draw(st.lists(identifier_strat, max_size=len(fw), min_size=len(fw), unique=True))

    projects = [
        ConfiguredProject(
            CoreId=c, 
            FirmwarePlatform=f,
            PlatformConfig={ 'ProjectName': n }, 
            AIModels=[
                ModelConfig(
                    Name=n,
                    Files=draw(st.just(FileInfo(Model=TEST_MODEL_PATH))),
                    OutDir=draw(st.just(Path('./src/generated_ai'))),
                    Target=draw(core_target_strat(soc, c, f)),
                    Backend=None,
                    Enabled=False
              )
          ]
        ) for c, n, f in zip(cores, names, fw)
    ]
    # A core exclusively owns an accelerator, therefore only one accelerator 
    # target allowed in a build. We assume each accelerator has a unique name
    for project in projects:
        acc_hist: set[str] = set()
        if project.models is None:
            raise RuntimeError(f'Generated a project without AIModels ! {project}')
        for config in project.models:
            if config.target.accelerator is None:
                config.enabled = True
                continue
            acc = config.target.accelerator
            if acc in acc_hist:
                continue
            else:
                config.enabled = True
                acc_hist.add(config.target.accelerator)

    return projects


@st.composite
def core_cfs_strat(draw: st.DrawFn):
    soc = draw(st.sampled_from(gt().supported_socs()))
    prjs = draw(core_prj_list_strat(soc))
    aiconfig = draw(core_ai_strat(soc))

    return CfsConfig(
        Soc=soc,
        AiConfig=aiconfig,
        Projects=prjs
    )
