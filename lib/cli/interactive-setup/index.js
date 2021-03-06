'use strict';

const inquirer = require('@serverless/utils/inquirer');
const { StepHistory } = require('@serverless/utils/telemetry');

const steps = {
  service: require('./service'),
  dashboardLogin: require('@serverless/dashboard-plugin/lib/cli/interactive-setup/dashboard-login'),
  dashboardSetOrg: require('@serverless/dashboard-plugin/lib/cli/interactive-setup/dashboard-set-org'),
  awsCredentials: require('./aws-credentials'),
  deploy: require('./deploy'),
};

module.exports = async (context) => {
  context = { ...context, inquirer, history: new Map() };
  const stepsDetails = new Map();
  for (const [stepName, step] of Object.entries(steps)) {
    delete context.stepHistory;
    delete context.inapplicabilityReasonCode;
    const stepData = await step.isApplicable(context);
    stepsDetails.set(stepName, {
      isApplicable: Boolean(stepData),
      inapplicabilityReasonCode: context.inapplicabilityReasonCode,
      timestamp: Date.now(),
      configuredQuestions: step.configuredQuestions,
    });
    if (stepData) {
      process.stdout.write('\n');
      context.stepHistory = new StepHistory();
      context.history.set(stepName, context.stepHistory);
      await step.run(context, stepData);
    }
  }

  const commandUsage = Array.from(stepsDetails.entries()).map(([step, stepDetails]) => {
    const stepHistory = context.history.get(step);
    return {
      name: step,
      ...stepDetails,
      history: stepHistory ? stepHistory.toJSON() : [],
    };
  });
  return { commandUsage, configuration: context.configuration };
};
