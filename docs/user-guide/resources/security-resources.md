---
description: The Trusted Edge Security Architecture installer from ADI.
author: Analog Devices
date: 2025-05-01
---

# Trusted Edge Security Architecture (TESA)

ADI's security for the Intelligent Edge is seamlessly bundled into CodeFusion Studio through **Trusted Edge**.

The Trusted Edge provides a foundational layer of security for customers by melding industry-standard crypto APIs with the capabilities of our hardware security solutions.

## Features

- **Flexibility** – Choose the crypto library that best fits your application. The Trusted Edge supports industry-standard crypto APIs.

- **Simplicity** – Access the hardware security capabilities of the complete ADI digital portfolio.

- **Reduced time-to-market** – The Trusted Edge provides foundational security for your application, reducing the time required to implement security.

## Installation

### Complete the software request form

The security installer for CodeFusion Studio is distributed under a non-disclosure agreement (NDA) through myAnalog.

!!! note
    A **myAnalog** account is required. Login or sign up at [analog.com](https://www.analog.com/en/index.html)

1. Access the [:octicons-link-external-24: Software Request Form](https://analog.com/srf){:target="_blank"}.
2. Log in or sign up for a myAnalog account.
3. Complete the required fields in the **Software Recipient Information** section.
4. Complete the required fields in the **Commercial information** section.
5. In the Software requested section, select **Security** for the target technology.

    !!! danger "Important"
        Leave **Processor/SoC** and **Hardware Platform** blank.

    ![Software requested](./images/software-requested-security.png)

6. Check the box for your preferred opperating system: Windows, macOS, or Linux.
7. Review the privacy settings and check the applicable boxes.
8. Click **Submit**.

A confirmation is sent to the email address provided in the software request form. Allow 10 business days for ADI to review the request. When the request is approved, an email is sent with a link to download the installer. The installer will also be accessible on your myAnalog account under **Resources** -> **Software Downloads**.

### Download the installer

Click the link received in your email or follow these steps to download the installer from myAnalog.

1. Access [:octicons-link-external-24: analog.com](https://www.analog.com/en/index.html){:target="_blank"}.

2. Log in to your **myAnalog** account.

    ![myAnalog](./images/myanalog.png)

3. Click **Your Account**.
4. Select **Resources** from the left navigation panel.

    ![Resources](./images/resources-nav.png)

5. Select **Software Downloads**.
6. Click on the latest version of the CodeFusion Studio Trusted Edge Security Architecture Installer.

    ![Software Downloads](./images/software-downloads.png)

7. Check the box to indicate that you have read and agree to the software license agreement and click **I Accept**.

    ![Accept license agreement](./images/accept-license.png)

The installer is downloaded to your computer.

!!! note
    You'll receive an email notification with a download link anytime a new version of the installer becomes available.

## Security Foundation Layer

### TESA middleware

#### Cryptographic libraries and APIs

- Crypto library options
    - mbedTLS
    - wolfSSL
    - PSA Crypto API
- ADI USS API
- Root of Trust Services
- Unified Security Software
    - Secure Storage
    - Crypto Toolbox
    - Secure Communication
    - Universal Crypto Library
- Hardware Crypto Accelerators and Security Features
- MCU Support
    - Trusted Firmware-M
    - MCUBoot

### MCU Support

#### Trusted Firmware-M (TF-M)

Trusted Firmware-M (TF-M) is the reference functional PSA implementation provided by[:octicons-link-external-24: TrustedFirmware.org](https://www.trustedfirmware.org/){:target="_blank"}. It provides trusted execution environment functionality for Armv8 microcontrollers with TrustZone extensions.

ADI's security offering for the Intelligent Edge is called **Trusted Edge Security Architecture** (TESA). The list of devices supported by ADI’s TESA is available at [:octicons-link-external-24: TF-M ADI](https://trustedfirmware-m.readthedocs.io/en/latest/platform/adi/index.html){:target="_blank"}

TESA provides out-of-the-box support for the open source generic TF-M implementation using mbedTLS for cryptographic functionality. It also provides a premium security configuration that enhances the performance of security services through Unified Security Software.

#### MCUBoot

MCUBoot is included in TF-M to provide Level 2 bootloader functionality within the boot chain, as part of the open source offering. TESA enhances the performance of security services through Unified Security Software, which is available as a configuration option.

### Unified Security Software

ADI Unified Security Software (USS) interfaces with the standard PSA API and ADI’s own USS API extensions through a backend that provides **Secure Boot**, **Secure Channel**, **Lifecycle Management**, **Secure Storage**, **Cryptographic Toolbox**, and **Attestation**. It includes standalone, MCU-only software security emulations for ADI MCUs.

The PSA Crypto implementation within USS is called the ADI Universal Crypto Library (UCL). UCL contains state-of-the-art implementations of cryptographic algorithms for ADI MCUs. It supports hashing, encryption/decryption, signature/verification, key exchange, and random number generation. It also implements countermeasures against side-channel attacks and utilizes the hardware accelerator of the target ADI platform whenever applicable.

#### TESA Driver

Unified Security Software provides rich, hardware-independent, industry-standard APIs for:

- Crypto  
- Life cycle management  
- Secure storage

### TESA Toolkit

The TESA toolkit includes utility scripts and firmware to:

- Generate signatures
- Enable Secure Boot ROM

The TESA toolkit is available at [:octicons-link-external-24: TESA-Toolkit](https://github.com/analogdevicesinc/tesa-toolkit){:target="_blank"}

### USS Supported boards

- **MAX32650**
    - [:octicons-link-external-24: EVKit V1](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/max32650-evkit.html){:target="_blank"}
    - [:octicons-link-external-24: FTHR](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/max32650fthr.html){:target="_blank"}
    - [:octicons-link-external-24: AD-SWIOT1L-SL](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/ad-swiot1l-sl.html){:target="_blank"}
- **MAX32670**
    - [:octicons-link-external-24: EVKit V1](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/max32670evkit.html){:target="_blank"}
- **MAX32690**
    - [:octicons-link-external-24: AD-APARD32690-SL](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/ad-apard32690-sl.html){:target="_blank"}
    - [:octicons-link-external-24: EVKit V1](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/max32690evkit.html){:target="_blank"}
    - [:octicons-link-external-24: FTHR](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/max32620fthr.html){:target="_blank"}
    - [:octicons-link-external-24: EVAL-ADIN1110](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/eval-adin1110.html){:target="_blank"}
    - [:octicons-link-external-24: MAXQ1065EVKIT](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/maxq1065evkit.html){:target="_blank"}
