#!/bin/bash


cli_parameters=("environment" "projectId" "region" "location"
  "setup-gcp" "setup-github" "push-image"
  "pool-name" "pool-desc" "pool-provider-name" "pool-provider-desc"
  "deploy-service-acct-name" "deploy-service-acct-display-name" "deploy-service-acct-desc"
  "run-service-acct-name" "run-service-acct-display-name" "run-service-acct-desc"
  "artifactory-name" "artifactory-desc" "image-name"
  "run-service-name" "run-service-role-name" "run-service-role-title"
  "run-service-role-desc"
  "github-org" "github-repo")
env_parameters=("ENV" "PROJECT_ID" "REGION" "LOCATION"
  "GCP_EXECUTE" "GH_EXECUTE" "GCP_PUSH"
  "POOL_NAME" "POOL_DESC" "POOL_PROVIDER_NAME" "POOL_PROVIDER_DESC"
  "DEPLOY_SERVICE_ACCT_NAME" "DEPLOY_SERVICE_ACCT_DISPLAY_NAME" "DEPLOY_SERVICE_ACCT_DESC"
  "RUN_SERVICE_ACCT_NAME" "RUN_SERVICE_ACCT_DISPLAY_NAME" "RUN_SERVICE_ACCT_DESC"
  "ARTIFACTORY_NAME" "ARTIFACTORY_DESC" "IMG_NAME"
  "RUN_SERVICE_NAME" "RUN_SERVICE_ROLE_NAME"  "RUN_SERVICE_ROLE_TITLE"
  "RUN_SERVICE_ROLE_DESC"
  "GITHUB_ORG" "GITHUB_REPO")
default_values=("dev" "" "us-east1" "us-east1"
  "yes" "yes" "yes"
  "webauthn-id-pool" "Webauthn Identity pool" "webauthn-provider" "Webauthn Identity Provider"
  "webauthn-deploy-acct" "Webauthn deployment service account" "Service account for Github authentication"
  "webauthn-service-acct" "Webauthn run service account" "Service account for running webauthn cloud run service"
  "webauthn-repo" "Webauthn Docker repository" "jhash_webauthn"
  "webauthn-service" "run.updateonly" "Service run update"
  "Custom role with permission to re-deploy cloud run service"
  "shekhar-jha" "webauthn")

EXTERNAL_URL=""
CONTINUE_ON_EXIT=${CONTINUE_ON_EXIT:-1}

function usage() {
  local usage="Usage: $0 "
  for ((i = 0; i < ${#cli_parameters[@]}; i++)); do
    local key="${cli_parameters[$i]}"
    local var="${env_parameters[$i]}"
    local default_value="${default_values[$i]}"
    if [[ -z $default_value ]]; then
      usage+="--$key <$key> "
    else
      usage+="[--${key} <$key>[default: $default_value]] "
    fi
  done
  echo "********************************************************"
  echo "$usage"
  echo "Optional: Default values will be used if not specified."
  echo "********************************************************"
  exit 1
}

function HandleExit() {
    if [[ "${1}" == "" ]] || [[ "${2}" == "" ]];
    then
      echo 'HandleExit <Outcome> <Exit Code>'
      exit 2
    fi
    local OUTCOME="${1:-1}"
    local REQUESTED_EXIT_CODE="${2:-0}"
    local EXIT_CODE=$((REQUESTED_EXIT_CODE + 0))
    if [[ $OUTCOME -ne 0 ]] && [[ $CONTINUE_ON_EXIT -ne 1 ]]; then
      exit $EXIT_CODE
    fi
}

# Loop through the command-line arguments and set the variables
while [[ $# -gt 0 ]]; do
  case "$1" in
    --*)
      key="${1:2}"
      index=-1
      for ((i = 0; i < ${#cli_parameters[@]}; i++)); do
        if [[ "${cli_parameters[$i]}" == "$key" ]]; then
          index=$i
          break
        fi
      done
      if [[ $index -ge 0 ]]; then
        var="${env_parameters[$index]}"
        shift
        export "$var=$1"
      else
        echo "Unrecognized command line argument: '$key'."
        usage
      fi
      ;;
    *)
      echo "Expected command line argument in format --<key> <value>; Unexpected key: '$1'."
      ;;
  esac
  shift
done

echo "********************* Configuration ********************"

ALL_ENV_SET=true
for ((i = 0; i < ${#cli_parameters[@]}; i++)); do
  key="${cli_parameters[$i]}"
  var="${env_parameters[$i]}"
  if [[ -z "${!var}" ]]; then
    default_value="${default_values[$i]}"
    if [[ -n $default_value ]]; then
      export "$var=$default_value"
      echo "'$var' = '$default_value'"
    else
      echo "'$var' = <not set>"
      ALL_ENV_SET=false
    fi
  else
    echo "'$var' = '${!var}'"
  fi
done
echo "********************************************************"

if [[ "${ALL_ENV_SET}" != "true" ]]; then
  usage
fi

if [[ "${GCP_EXECUTE}" == "yes" ]]; then
  GCP_CLOUD_LOGIN_ACCT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
  if [[ "${GCP_CLOUD_LOGIN_ACCT}" == "" ]]; then
    echo "GCP: No authentication detected. Please login using 'gcloud auth login' to continue."
    exit 11
  else
    echo "Executing script using GCP Login >${GCP_CLOUD_LOGIN_ACCT}<"
  fi


  gcloud config set project "${PROJECT_ID}"
  gcloud config set run/region "${REGION}"
  PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format "value(projectNumber)")

  BETA_INSTALLED=$(gcloud components list --filter=name:beta --format="value(state.name)" 2>/dev/null)
  HandleExit $? 31
  if [[ "${BETA_INSTALLED}" != "Installed" ]]; then
    echo "Run 'gcloud components install beta' to install beta component before proceeding"
    exit 32
  fi

  POOL_CREATED=$(gcloud iam workload-identity-pools list --location=global --filter="name:${POOL_NAME}" --format="value(name)")
  if [[ "${POOL_CREATED}" == "" ]]; then
    echo "Creating pool"
    gcloud iam workload-identity-pools create "${POOL_NAME}" \
      --project="${PROJECT_ID}" \
      --location="global" \
      --display-name="${POOL_DESC}"
    HandleExit $? 12
  else
    echo "GCP: Workload identity pool ${POOL_NAME} already exists as ${POOL_CREATED}"
  fi

  PROVIDER_CREATED=$(gcloud iam workload-identity-pools providers list --workload-identity-pool="${POOL_NAME}" \
            --location=global --filter="name:${POOL_PROVIDER_NAME}" --format="value(name)")
  if [[ "${PROVIDER_CREATED}" == "" ]]; then
    gcloud iam workload-identity-pools providers create-oidc "${POOL_PROVIDER_NAME}" \
      --project="${PROJECT_ID}" \
      --location="global" \
      --workload-identity-pool="${POOL_NAME}" \
      --display-name="${POOL_PROVIDER_DESC}" \
      --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository" \
      --issuer-uri="https://token.actions.githubusercontent.com"
    HandleExit $? 13
  else
    echo "GCP: Workload identity pool provider ${POOL_PROVIDER_NAME} for pool ${POOL_NAME} already exists as ${PROVIDER_CREATED}"
  fi

  SVC_CREATED=$(gcloud iam service-accounts list --filter="name:${DEPLOY_SERVICE_ACCT_NAME} AND disabled:false" --format="value(email)")
  if [[ "${SVC_CREATED}" == "" ]]; then
    gcloud iam service-accounts create "${DEPLOY_SERVICE_ACCT_NAME}" \
      --display-name="${DEPLOY_SERVICE_ACCT_DISPLAY_NAME}" --description="${DEPLOY_SERVICE_ACCT_DESC}"
    HandleExit $? 14
  else
    echo "GCP: Service account ${DEPLOY_SERVICE_ACCT_NAME} already exists as ${SVC_CREATED}"
  fi

  gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"
  HandleExit $? 15

  RUN_SVC_CREATED=$(gcloud iam service-accounts list --filter="name:${RUN_SERVICE_ACCT_NAME} AND disabled:false" --format="value(email)")
  if [[ "${RUN_SVC_CREATED}" == "" ]]; then
    gcloud iam service-accounts create "${RUN_SERVICE_ACCT_NAME}" \
      --display-name="${RUN_SERVICE_ACCT_DISPLAY_NAME}" --description="${RUN_SERVICE_ACCT_DESC}"
    HandleExit $? 16
  else
    echo "GCP: Service account ${RUN_SERVICE_ACCT_NAME} already exists as ${RUN_SVC_CREATED}"
  fi

  gcloud services enable "artifactregistry.googleapis.com"
  HandleExit $? 17
  gcloud services enable "run.googleapis.com"
  HandleExit $? 18
  gcloud services enable "iamcredentials.googleapis.com"
  HandleExit $? 19


  ARTIFACT_EXIST=$(gcloud artifacts repositories list --location="${LOCATION}" --filter="name:${ARTIFACTORY_NAME}" --format="value(name)")
  if [[ "${ARTIFACT_EXIST}" == "" ]]; then
    gcloud artifacts repositories create "${ARTIFACTORY_NAME}" --location="${LOCATION}" --repository-format=docker \
      --description="${ARTIFACTORY_DESC}" --mode="standard-repository" --project="${PROJECT_ID}"
    HandleExit $? 20
  else
    echo "GCP: Artifactory ${ARTIFACTORY_NAME} already exists as ${ARTIFACT_EXIST}"
  fi

  gcloud artifacts repositories add-iam-policy-binding \
    "${ARTIFACTORY_NAME}" --location="${LOCATION}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOY_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"
  HandleExit $? 21
  if [[ "${GCP_PUSH}" == "yes" ]]; then
    make package
    DOCKER_IMAGE_EXISTS=$(docker images "${IMG_NAME}:latest" -q)
    if [[ "${DOCKER_IMAGE_EXISTS}" == "" ]]; then
      echo "Docker: Failed to create docker image. Skipping service deployment"
    else
      GCP_IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACTORY_NAME}/${IMG_NAME}"
      docker tag "${IMG_NAME}:latest" "${GCP_IMAGE_NAME}:latest"
      HandleExit $? 22
      echo "**** If the push fails due to unauthorized access, run 'gcloud auth configure-docker' to setup docker authn helpers ****"
      docker push "${GCP_IMAGE_NAME}"
      HandleExit $? 23
      gcloud run deploy "${RUN_SERVICE_NAME}" \
        --image="${GCP_IMAGE_NAME}" \
        --platform=managed \
        --allow-unauthenticated \
        --service-account="${RUN_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --region="${REGION}" \
        --project="${PROJECT_ID}"
      HandleExit $? 24
    fi
  fi
  CUST_ROLE_EXISTS=$(gcloud iam roles describe "${RUN_SERVICE_ROLE_NAME}" --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null)
  if [[ "${CUST_ROLE_EXISTS}" == "" ]]; then
    # Note: the permission does not restrict using role to update other services at this time
    gcloud iam roles create "${RUN_SERVICE_ROLE_NAME}" --project="${PROJECT_ID}" \
      --title="${RUN_SERVICE_ROLE_TITLE}" \
      --description="${RUN_SERVICE_ROLE_DESC}" \
      --stage="GA" --permissions="run.services.update,run.services.get"
    HandleExit $? 25
  else
    echo "GCP: Custom role ${RUN_SERVICE_ROLE_NAME} already exists."
    gcloud iam roles update "${RUN_SERVICE_ROLE_NAME}" --project="${PROJECT_ID}" \
      --permissions="run.services.update,run.services.get"
    HandleExit $? 26
  fi

  gcloud run services add-iam-policy-binding "${RUN_SERVICE_NAME}" \
      --region="${REGION}" --project="${PROJECT_ID}" \
      --platform="managed" \
      --member="serviceAccount:${DEPLOY_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="projects/${PROJECT_ID}/roles/${RUN_SERVICE_ROLE_NAME}"
  HandleExit $? 27

  gcloud iam service-accounts add-iam-policy-binding "${RUN_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --member "serviceAccount:${DEPLOY_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role "roles/iam.serviceAccountUser"
  HandleExit $? 28
  RUN_ALT_URL=$(gcloud beta run domain-mappings list --filter=webauthn-service --format="value(DOMAIN)" --region="${REGION}" --project="${PROJECT_ID}" )
  HandleExit $? 30
  if [[ "${RUN_ALT_URL}" == "" ]]; then
    RUN_SERVICE_URL=$(gcloud run services describe webauthn-service --format="value(status.address.url)")
    HandleExit $? 29
  else
    RUN_SERVICE_URL="https://${RUN_ALT_URL}"
  fi
  EXTERNAL_URL=$(echo "${RUN_SERVICE_URL}"| sed 's/\//\\\//g')

else
  echo "Skipping the GCP steps"
fi

if [[ "${GH_EXECUTE}" == "yes" ]]; then
  GH_LOGIN_RESP=$(gh auth status 2>&1)
  GH_STATUS=$?
  if [[ $GH_STATUS -ne 0 ]]; then
    echo "Github: No authentication detected. Please setup token or using 'gh auth login'"
    echo "${GH_LOGIN_RESP}"
    exit 41
  else
    echo "Github login setup"
    echo "${GH_LOGIN_RESP}"
  fi

  IDP_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${POOL_PROVIDER_NAME}"
  gh api --method GET -H "Accept: application/vnd.github+json" "repos/${GITHUB_ORG}/${GITHUB_REPO}/environments/${ENV}"
  ENV_EXISTS=$?
  if [[ $ENV_EXISTS -ne 0 ]]; then
    echo "Creating ${ENV}...."
    gh api --method PUT -H "Accept: application/vnd.github+json" "repos/${GITHUB_ORG}/${GITHUB_REPO}/environments/${ENV}"
    HandleExit $? 42
  else
    echo "Environment ${ENV} already exists."
  fi
  if [[ "${EXTERNAL_URL}" != "" ]]; then
    echo "Setting URL to ${EXTERNAL_URL}"
    gh variable set "EXTERNAL_URL" --body "${EXTERNAL_URL}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  fi
  gh secret set "GCP_Workload_IDP_Name" --body "${IDP_NAME}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_SERVICE_ACCT" --body "${DEPLOY_SERVICE_ACCT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_PROJECT_ID" --body "${PROJECT_ID}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_ARTIFACTORY_LOCATION" --body "${LOCATION}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_ARTIFACTORY_NAME" --body "${ARTIFACTORY_NAME}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_CLOUD_RUN_SERVICE_REGION" --body "${REGION}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_CLOUD_RUN_SERVICE_NAME" --body "${RUN_SERVICE_NAME}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh secret set "GCP_CLOUD_RUN_IMG_NAME" --body "${IMG_NAME}" --env "${ENV}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
else
  echo "Skipping the Github steps"
fi