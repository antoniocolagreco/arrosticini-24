import { oc } from "@orpc/contract";
import { z } from "zod";
import { authed, IdDto, LocaleDto } from "./common.js";

export const MAX_ADDRESSES_PER_USER = 5;

export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const Password = z.string().min(8).max(128);

export const Role = z.enum(["customer", "admin"]);

const PersonName = z.string().trim().min(1).max(60);

export const UserDto = z.object({
  id: IdDto,
  email: Email,
  role: Role,
  firstName: PersonName,
  lastName: PersonName,
  preferredLocale: LocaleDto,
  createdAt: z.iso.datetime(),
});

export const AddressFields = {
  fullName: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().regex(/^[A-Z]{2}$/),
  phone: z.string().trim().min(1).max(30),
};

export const AddressDto = z.object({
  id: IdDto,
  ...AddressFields,
  isDefault: z.boolean(),
});

export type Email = z.infer<typeof Email>;
export type Role = z.infer<typeof Role>;
export type UserDto = z.infer<typeof UserDto>;
export type AddressDto = z.infer<typeof AddressDto>;

const addressNotFound = { ADDRESS_NOT_FOUND: { status: 404 } } as const;

export const registerUser = oc
  .route({ method: "POST", path: "/identity/users", successStatus: 201 })
  .input(
    z.object({
      email: Email,
      password: Password,
      firstName: PersonName,
      lastName: PersonName,
      preferredLocale: LocaleDto,
    }),
  )
  .output(UserDto)
  .errors({ EMAIL_TAKEN: { status: 409 } });

export const verifyCredentials = oc
  .route({ method: "POST", path: "/identity/credentials/verify" })
  .input(z.object({ email: Email, password: z.string().min(1).max(128) }))
  .output(UserDto)
  .errors({ INVALID_CREDENTIALS: { status: 401 } });

export const getMe = authed.route({ method: "GET", path: "/identity/me" }).output(UserDto);

export const updateMe = authed
  .route({ method: "PATCH", path: "/identity/me" })
  .input(
    z.object({
      firstName: PersonName.optional(),
      lastName: PersonName.optional(),
      preferredLocale: LocaleDto.optional(),
    }),
  )
  .output(UserDto);

export const changePassword = authed
  .route({ method: "POST", path: "/identity/me/password", successStatus: 204 })
  .input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: Password }))
  .output(z.void())
  .errors({ INVALID_CURRENT_PASSWORD: { status: 422 } });

export const listAddresses = authed
  .route({ method: "GET", path: "/identity/me/addresses" })
  .output(z.object({ items: z.array(AddressDto) }));

export const addAddress = authed
  .route({ method: "POST", path: "/identity/me/addresses", successStatus: 201 })
  .input(z.object({ ...AddressFields, isDefault: z.boolean().optional() }))
  .output(AddressDto)
  .errors({ ADDRESS_LIMIT_REACHED: { status: 409 } });

export const updateAddress = authed
  .route({ method: "PATCH", path: "/identity/me/addresses/{id}" })
  .input(
    z.object({
      id: IdDto,
      fullName: AddressFields.fullName.optional(),
      line1: AddressFields.line1.optional(),
      line2: AddressFields.line2.nullable(),
      city: AddressFields.city.optional(),
      postalCode: AddressFields.postalCode.optional(),
      country: AddressFields.country.optional(),
      phone: AddressFields.phone.optional(),
      isDefault: z.literal(true).optional(),
    }),
  )
  .output(AddressDto)
  .errors(addressNotFound);

export const deleteAddress = authed
  .route({ method: "DELETE", path: "/identity/me/addresses/{id}", successStatus: 204 })
  .input(z.object({ id: IdDto }))
  .output(z.void())
  .errors(addressNotFound);

export const identityContract = {
  registerUser,
  verifyCredentials,
  getMe,
  updateMe,
  changePassword,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
};
