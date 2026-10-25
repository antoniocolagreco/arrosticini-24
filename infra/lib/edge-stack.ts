import { Stack, type StackProps } from "aws-cdk-lib";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import type { Construct } from "constructs";

interface ArrosticiniEdgeStackProps extends StackProps {
  domainName: string;
}

export class ArrosticiniEdgeStack extends Stack {
  readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: ArrosticiniEdgeStackProps) {
    super(scope, id, props);

    const { domainName } = props;

    this.certificate = new Certificate(this, "Certificate", {
      domainName,
      validation: CertificateValidation.fromDns(),
    });
  }
}
