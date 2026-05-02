import { gql } from '@apollo/client';

const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    university
    academicYear
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const REGISTER_MUTATION = gql`
  mutation Register(
    $firstName: String!
    $lastName: String!
    $email: String!
    $password: String!
    $university: String!
    $academicYear: String!
    $phone: String
  ) {
    register(
      firstName: $firstName
      lastName: $lastName
      email: $email
      password: $password
      university: $university
      academicYear: $academicYear
      phone: $phone
    ) {
      token
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const GET_ME = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;