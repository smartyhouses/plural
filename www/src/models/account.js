import gql from "graphql-tag";
import { VersionFragment } from "./chart";
import { IntegrationWebhookFragment } from "./integrations";
import { RepoFragment } from "./repo";
import { GroupFragment, RoleFragment, UserFragment } from "./user";

export const AuditFragment = gql`
  fragment AuditFragment on Audit {
    id
    action
    ip
    country
    city
    latitude
    longitude
    actor { ...UserFragment }
    repository { ...RepoFragment }
    group { ...GroupFragment }
    integrationWebhook { ...IntegrationWebhookFragment }
    role { ...RoleFragment }
    version { ...VersionFragment }
    image { id tag dockerRepository { name } }
    insertedAt
  }
  ${UserFragment}
  ${RepoFragment}
  ${GroupFragment}
  ${IntegrationWebhookFragment}
  ${RoleFragment}
  ${VersionFragment}
`

export const PolicyBindingFragment = gql`
  fragment PolicyBindingFragment on PolicyBinding {
    id
    group { id name }
    user { id name email }
  }
`

export const DnsDomainFragment = gql`
  fragment DnsDomainFragment on DnsDomain {
    id
    name
    creator { ...UserFragment }
    accessPolicy { 
      id
      bindings { ...PolicyBindingFragment }
    }
    insertedAt
  }
  ${UserFragment}
  ${PolicyBindingFragment}
`;

export const DnsRecordFragment = gql`
  fragment DnsRecordFragment on DnsRecord {
    id
    name
    type
    records
    cluster
    provider
    creator { ...UserFragment }
  }
  ${UserFragment}
`;