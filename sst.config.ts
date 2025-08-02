import { NextjsSite } from "sst/constructs";
import { Duration } from "aws-cdk-lib/core";
import acm from "aws-cdk-lib/aws-certificatemanager";
import route53 from "aws-cdk-lib/aws-route53";
import { type SSTConfig } from "sst";
import dotEnv from "dotenv";

export default {
  config() {
    return {
      name: "redirect-test-app",
      region: "us-east-1",
    };
  },
  async stacks(app) {
    await app.stack(async function Site({ stack }) {
      // Config env
      const { parsed: envVars } = dotEnv.config({
        path: `.env.local`,
      });

      // Look up hosted zone
      let hostedZone: route53.IHostedZone | undefined = undefined;
      hostedZone = route53.HostedZone.fromLookup(
        stack,
        `redirect-test-app-${app.stage}-hostedZone`,
        {
          domainName: "example.com",
        }
      );

      // Define certificate to use
      let certificate: acm.ICertificate | undefined = undefined;
      certificate = new acm.Certificate(
        stack,
        `redirect-test-app-${app.stage}-certificate`,
        {
          domainName: "redirect-test.example.com",
          certificateName: `redirect-test-app-next-${app.stage}`,
          validation:
            hostedZone && acm.CertificateValidation.fromDns(hostedZone),
        }
      );

      // Create the site with all previous configurations
      const site = new NextjsSite(stack, "redirect-test-app", {
        environment: envVars,
        customDomain: {
          domainName: "redirect-test.example.com",
          isExternalDomain: false,
          cdk: { hostedZone, certificate },
        },
        timeout: "30 seconds",
        runtime: "nodejs20.x",
        cdk: {
          distribution: {
            errorResponses: [
              {
                httpStatus: 400,
                responseHttpStatus: 400,
                responsePagePath: "/_errors/something-went-wrong.html",
                ttl: Duration.seconds(0),
              },
              {
                httpStatus: 504,
                responseHttpStatus: 504,
                responsePagePath: "/_errors/something-went-wrong.html",
                ttl: Duration.seconds(0),
              },
              {
                httpStatus: 502,
                responseHttpStatus: 504,
                responsePagePath: "/_errors/something-went-wrong.html",
                ttl: Duration.seconds(0),
              },
              {
                httpStatus: 503,
                responseHttpStatus: 504,
                responsePagePath: "/_errors/something-went-wrong.html",
                ttl: Duration.seconds(0),
              },
            ],
          },
        },
        openNextVersion: "3.7.2",
      });

      // Show the CF distribution domain name in the output
      stack.addOutputs({
        DistributionDomainName: site.cdk?.distribution.distributionDomainName,
      });
    });
  },
} satisfies SSTConfig;
